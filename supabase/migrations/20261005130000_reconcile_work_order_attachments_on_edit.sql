-- Keep attachment edits transactional with the existing Work Order edit RPC.
-- Existing metadata may belong to another uploader, so these narrowly scoped
-- SECURITY DEFINER helpers repeat the record-edit authorization explicitly.

create or replace function public.validate_work_order_attachment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if row(
      new.id, new.organization_id, new.work_order_id, new.kind, new.storage_path,
      new.file_name, new.content_type, new.byte_size, new.uploaded_by, new.created_at
    ) is distinct from row(
      old.id, old.organization_id, old.work_order_id, old.kind, old.storage_path,
      old.file_name, old.content_type, old.byte_size, old.uploaded_by, old.created_at
    ) then
      raise exception 'Only the Work Order attachment thumbnail can be changed';
    end if;
    if not public.has_work_order_permission(old.work_order_id, 'work_orders.edit') then
      raise exception 'You do not have permission to change this Work Order attachment';
    end if;
    return new;
  end if;

  if not exists (
    select 1 from public.work_orders work_orders
    where work_orders.id = new.work_order_id and work_orders.organization_id = new.organization_id
      and (
        work_orders.created_by = auth.uid()
        or public.has_work_order_permission(work_orders.id, 'work_orders.edit')
      )
  ) then
    raise exception 'Attachment must belong to a Work Order the current user can create or edit';
  end if;
  if new.uploaded_by is distinct from auth.uid() then
    raise exception 'Attachment uploader must be the current user';
  end if;
  return new;
end;
$$;

create or replace function public.reconcile_work_order_attachments(
  target_work_order_id uuid,
  target_organization_id uuid,
  target_attachment_state jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  selected_attachment jsonb;
  existing_attachment public.work_order_attachments;
  selected_attachment_id uuid;
  selected_storage_path text;
  selected_kind text;
  selected_file_name text;
  selected_content_type text;
  selected_byte_size bigint;
  selected_thumbnail boolean;
  retained_attachment_ids uuid[] := array[]::uuid[];
  selected_thumbnail_id uuid;
  selected_thumbnail_count integer := 0;
  removed_attachment_paths jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to edit Work Order attachments' using errcode = '42501';
  end if;
  if not public.has_work_order_permission(target_work_order_id, 'work_orders.edit') then
    raise exception 'You do not have permission to edit this Work Order' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.work_orders work_orders
    where work_orders.id = target_work_order_id
      and work_orders.organization_id = target_organization_id
  ) then
    raise exception 'Work Order not found in this organization';
  end if;
  if target_attachment_state is null or jsonb_typeof(target_attachment_state) <> 'array' then
    raise exception 'Attachment state must be an array';
  end if;

  for selected_attachment in select value from jsonb_array_elements(target_attachment_state)
  loop
    if jsonb_typeof(selected_attachment) <> 'object' then
      raise exception 'Each attachment state item must be an object';
    end if;
    selected_attachment_id := nullif(selected_attachment ->> 'id', '')::uuid;
    if selected_attachment_id is null or selected_attachment_id = any(retained_attachment_ids) then
      raise exception 'Attachment IDs must be present and unique';
    end if;
    selected_thumbnail := coalesce((selected_attachment ->> 'is_thumbnail')::boolean, false);

    if coalesce((selected_attachment ->> 'existing')::boolean, false) then
      select * into existing_attachment
      from public.work_order_attachments attachments
      where attachments.id = selected_attachment_id
        and attachments.organization_id = target_organization_id
        and attachments.work_order_id = target_work_order_id;
      if not found then
        raise exception 'Existing attachment does not belong to this Work Order';
      end if;
      if selected_thumbnail and existing_attachment.kind <> 'image' then
        raise exception 'Only a Work Order image can be selected as the thumbnail';
      end if;
      retained_attachment_ids := array_append(retained_attachment_ids, selected_attachment_id);
    else
      selected_storage_path := selected_attachment ->> 'storage_path';
      selected_kind := selected_attachment ->> 'kind';
      selected_file_name := btrim(selected_attachment ->> 'file_name');
      selected_content_type := coalesce(nullif(selected_attachment ->> 'content_type', ''), 'application/octet-stream');
      selected_byte_size := nullif(selected_attachment ->> 'byte_size', '')::bigint;

      if selected_storage_path is null
        or array_length(string_to_array(selected_storage_path, '/'), 1) <> 4
        or split_part(selected_storage_path, '/', 1) <> target_organization_id::text
        or split_part(selected_storage_path, '/', 2) <> auth.uid()::text
        or split_part(selected_storage_path, '/', 3) <> target_work_order_id::text then
        raise exception 'New attachment path must match its organization, uploader, and Work Order' using errcode = '42501';
      end if;
      if selected_kind not in ('image', 'file')
        or (selected_kind = 'image' and selected_content_type not like 'image/%')
        or (selected_thumbnail and selected_kind <> 'image') then
        raise exception 'New Work Order attachment type or thumbnail is invalid';
      end if;
      if selected_file_name is null or char_length(selected_file_name) not between 1 and 255
        or selected_byte_size is null or selected_byte_size not between 1 and 10485760 then
        raise exception 'New Work Order attachment metadata is invalid';
      end if;
      if not exists (
        select 1 from storage.objects objects
        where objects.bucket_id = 'work-order-attachments'
          and objects.name = selected_storage_path
      ) then
        raise exception 'Work Order attachment object was not uploaded';
      end if;
      retained_attachment_ids := array_append(retained_attachment_ids, selected_attachment_id);
    end if;

    if selected_thumbnail then
      selected_thumbnail_count := selected_thumbnail_count + 1;
      selected_thumbnail_id := selected_attachment_id;
    end if;
  end loop;

  if selected_thumbnail_count > 1 then
    raise exception 'A Work Order can have only one thumbnail';
  end if;

  with removed as (
    delete from public.work_order_attachments attachments
    where attachments.organization_id = target_organization_id
      and attachments.work_order_id = target_work_order_id
      and not (attachments.id = any(retained_attachment_ids))
    returning attachments.storage_path
  )
  select coalesce(jsonb_agg(removed.storage_path), '[]'::jsonb)
    into removed_attachment_paths
  from removed;

  update public.work_order_attachments attachments
  set is_thumbnail = false
  where attachments.organization_id = target_organization_id
    and attachments.work_order_id = target_work_order_id
    and attachments.is_thumbnail;

  for selected_attachment in select value from jsonb_array_elements(target_attachment_state)
  loop
    if not coalesce((selected_attachment ->> 'existing')::boolean, false) then
      insert into public.work_order_attachments (
        id, organization_id, work_order_id, kind, storage_path, file_name,
        content_type, byte_size, is_thumbnail, uploaded_by
      ) values (
        (selected_attachment ->> 'id')::uuid,
        target_organization_id,
        target_work_order_id,
        selected_attachment ->> 'kind',
        selected_attachment ->> 'storage_path',
        btrim(selected_attachment ->> 'file_name'),
        coalesce(nullif(selected_attachment ->> 'content_type', ''), 'application/octet-stream'),
        (selected_attachment ->> 'byte_size')::bigint,
        false,
        auth.uid()
      );
    end if;
  end loop;

  if selected_thumbnail_id is not null then
    update public.work_order_attachments attachments
    set is_thumbnail = true
    where attachments.id = selected_thumbnail_id
      and attachments.organization_id = target_organization_id
      and attachments.work_order_id = target_work_order_id;
  end if;

  return removed_attachment_paths;
end;
$$;

revoke execute on function public.reconcile_work_order_attachments(uuid, uuid, jsonb) from public;
grant execute on function public.reconcile_work_order_attachments(uuid, uuid, jsonb) to authenticated;

create or replace function public.update_work_order_with_attachment_state(
  target_work_order_id uuid,
  target_organization_id uuid,
  target_title text,
  target_description text default null,
  target_priority text default null,
  target_due_date date default null,
  target_due_time time default null,
  target_start_date date default null,
  target_estimated_duration_minutes integer default null,
  target_work_type text default 'reactive',
  target_assignments jsonb default null,
  target_attachments jsonb default '[]'::jsonb,
  target_attachment_state jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_work_order jsonb;
  removed_attachment_paths jsonb;
begin
  updated_work_order := public.update_work_order_with_assignments(
    target_work_order_id,
    target_organization_id,
    target_title,
    target_description,
    target_priority,
    target_due_date,
    target_due_time,
    target_start_date,
    target_estimated_duration_minutes,
    target_work_type,
    target_assignments,
    target_attachments
  );
  removed_attachment_paths := public.reconcile_work_order_attachments(
    target_work_order_id,
    target_organization_id,
    target_attachment_state
  );
  return updated_work_order || jsonb_build_object('removed_attachment_paths', removed_attachment_paths);
end;
$$;

revoke execute on function public.update_work_order_with_attachment_state(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.update_work_order_with_attachment_state(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb, jsonb) to authenticated;

drop policy if exists "Uploaders can remove Work Order attachment objects" on storage.objects;
create policy "Uploaders can remove Work Order attachment objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'work-order-attachments'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or exists (
        select 1 from public.work_orders work_orders
        where work_orders.organization_id::text = (storage.foldername(name))[1]
          and work_orders.id::text = (storage.foldername(name))[3]
          and public.has_work_order_permission(work_orders.id, 'work_orders.edit')
      )
    )
  );

notify pgrst, 'reload schema';

select 'Work Order attachments can be managed in the edit image loader' as result;
