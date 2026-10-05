-- Keep core edits, assignment replacement, and new attachment metadata in one
-- transaction while leaving table RLS and existing permission triggers active.
create or replace function public.update_work_order_with_assignments(
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
  target_attachments jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  updated_work_order public.work_orders;
  selected_assignment jsonb;
  selected_attachment jsonb;
  selected_user_id uuid;
  selected_team_id uuid;
  existing_assignment_count integer;
  deleted_assignment_count integer;
  selected_storage_path text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to edit a Work Order' using errcode = '42501';
  end if;
  if not public.has_work_order_permission(target_work_order_id, 'work_orders.edit') then
    raise exception 'You do not have permission to edit this Work Order' using errcode = '42501';
  end if;
  if target_title is null or btrim(target_title) = '' then
    raise exception 'A Work Order title is required';
  end if;
  if target_priority is not null and target_priority not in ('Low', 'Medium', 'High', 'Urgent') then
    raise exception 'Choose a valid Work Order priority';
  end if;
  if target_work_type not in ('reactive', 'preventive') then
    raise exception 'Choose a valid Work Type';
  end if;
  if target_estimated_duration_minutes is not null and target_estimated_duration_minutes <= 0 then
    raise exception 'Estimated time must be greater than zero minutes';
  end if;
  if target_attachments is null or jsonb_typeof(target_attachments) <> 'array' then
    raise exception 'Attachments must be an array';
  end if;

  if target_assignments is not null then
    if jsonb_typeof(target_assignments) <> 'array' then
      raise exception 'Assignments must be an array';
    end if;
    if not public.has_work_order_assignment_permission(target_work_order_id) then
      raise exception 'You do not have permission to change Work Order assignments' using errcode = '42501';
    end if;

    for selected_assignment in select value from jsonb_array_elements(target_assignments)
    loop
      selected_user_id := nullif(selected_assignment ->> 'user_id', '')::uuid;
      selected_team_id := nullif(selected_assignment ->> 'team_id', '')::uuid;
      if (selected_user_id is null) = (selected_team_id is null) then
        raise exception 'Each assignment must target exactly one user or team';
      end if;
      if not public.can_assign_work_order_target(target_organization_id, selected_user_id, selected_team_id) then
        raise exception 'You do not have permission to assign this Work Order to that target' using errcode = '42501';
      end if;
    end loop;

    select nullif(assignment.value ->> 'user_id', '')::uuid
      into selected_user_id
    from jsonb_array_elements(target_assignments) with ordinality as assignment(value, position)
    where nullif(assignment.value ->> 'user_id', '') is not null
    order by assignment.position
    limit 1;
    select nullif(assignment.value ->> 'team_id', '')::uuid
      into selected_team_id
    from jsonb_array_elements(target_assignments) with ordinality as assignment(value, position)
    where nullif(assignment.value ->> 'team_id', '') is not null
    order by assignment.position
    limit 1;
  end if;

  update public.work_orders
  set title = btrim(target_title),
      description = nullif(btrim(target_description), ''),
      priority = target_priority,
      due_date = target_due_date,
      due_time = case when target_due_date is null then null else target_due_time end,
      start_date = target_start_date,
      estimated_duration_minutes = target_estimated_duration_minutes,
      work_type = target_work_type,
      assigned_to = case when target_assignments is null then work_orders.assigned_to else selected_user_id end,
      team_id = case when target_assignments is null then work_orders.team_id else selected_team_id end
  where organization_id = target_organization_id and id = target_work_order_id
  returning * into updated_work_order;

  if not found then
    raise exception 'Work Order not found in this organization';
  end if;

  if target_assignments is not null then
    select count(*) into existing_assignment_count
    from public.work_order_assignments
    where organization_id = target_organization_id and work_order_id = target_work_order_id;

    delete from public.work_order_assignments
    where organization_id = target_organization_id and work_order_id = target_work_order_id;
    get diagnostics deleted_assignment_count = row_count;
    if deleted_assignment_count <> existing_assignment_count then
      raise exception 'Unable to replace all existing Work Order assignments' using errcode = '42501';
    end if;

    for selected_assignment in select value from jsonb_array_elements(target_assignments)
    loop
      insert into public.work_order_assignments (organization_id, work_order_id, user_id, team_id)
      values (
        target_organization_id,
        target_work_order_id,
        nullif(selected_assignment ->> 'user_id', '')::uuid,
        nullif(selected_assignment ->> 'team_id', '')::uuid
      );
    end loop;
  end if;

  for selected_attachment in select value from jsonb_array_elements(target_attachments)
  loop
    selected_storage_path := selected_attachment ->> 'storage_path';
    if split_part(selected_storage_path, '/', 1) <> target_organization_id::text
      or split_part(selected_storage_path, '/', 2) <> auth.uid()::text
      or split_part(selected_storage_path, '/', 3) <> target_work_order_id::text then
      raise exception 'Work Order attachment path must match its organization, uploader, and Work Order' using errcode = '42501';
    end if;
    if selected_attachment ->> 'kind' not in ('image', 'file')
      or coalesce((selected_attachment ->> 'is_thumbnail')::boolean, false) then
      raise exception 'Edit attachments must be valid images or files and cannot replace the existing thumbnail';
    end if;
    insert into public.work_order_attachments (
      id, organization_id, work_order_id, kind, storage_path, file_name,
      content_type, byte_size, is_thumbnail, uploaded_by
    ) values (
      (selected_attachment ->> 'id')::uuid,
      target_organization_id,
      target_work_order_id,
      selected_attachment ->> 'kind',
      selected_storage_path,
      selected_attachment ->> 'file_name',
      coalesce(nullif(selected_attachment ->> 'content_type', ''), 'application/octet-stream'),
      (selected_attachment ->> 'byte_size')::bigint,
      false,
      auth.uid()
    );
  end loop;

  select * into updated_work_order
  from public.work_orders
  where organization_id = target_organization_id and id = target_work_order_id;
  return to_jsonb(updated_work_order);
end;
$$;

revoke execute on function public.update_work_order_with_assignments(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb) from public;
grant execute on function public.update_work_order_with_assignments(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb) to authenticated;

drop policy if exists "Authorized members can upload Work Order attachment objects" on storage.objects;
create policy "Authorized members can upload Work Order attachment objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'work-order-attachments'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (
      public.has_organization_permission(((storage.foldername(name))[1])::uuid, 'work_orders.create', 'own')
      or exists (
        select 1 from public.work_orders work_orders
        where work_orders.organization_id::text = (storage.foldername(name))[1]
          and work_orders.id::text = (storage.foldername(name))[3]
          and public.has_work_order_permission(work_orders.id, 'work_orders.edit')
      )
    )
  );

notify pgrst, 'reload schema';

select 'Work Order edit transaction and attachment permission installed' as result;
