-- The creation RPC is a narrow SECURITY DEFINER boundary because its INSERT
-- is rejected by the table RLS policy despite the authenticated caller
-- satisfying the same create permission check. Revalidate every authorization
-- decision explicitly before using the function owner's table privileges.
create or replace function public.create_work_order_with_assignments(
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
  target_assignments jsonb default '[]'::jsonb,
  target_attachments jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  created_work_order public.work_orders;
  selected_assignment jsonb;
  selected_user_id uuid;
  selected_team_id uuid;
  selected_attachment jsonb;
  selected_storage_path text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a Work Order' using errcode = '42501';
  end if;
  if not public.has_organization_permission(target_organization_id, 'work_orders.create', 'own') then
    raise exception 'You do not have permission to create Work Orders in this organization' using errcode = '42501';
  end if;
  if jsonb_typeof(target_assignments) <> 'array' or jsonb_typeof(target_attachments) <> 'array' then
    raise exception 'Assignments and attachments must be arrays';
  end if;

  select nullif(assignment.value ->> 'user_id', '')::uuid
    into selected_user_id
  from jsonb_array_elements(target_assignments) as assignment(value)
  where nullif(assignment.value ->> 'user_id', '') is not null
  limit 1;
  select nullif(assignment.value ->> 'team_id', '')::uuid
    into selected_team_id
  from jsonb_array_elements(target_assignments) as assignment(value)
  where nullif(assignment.value ->> 'team_id', '') is not null
  limit 1;

  insert into public.work_orders (
    id, organization_id, title, description, priority, due_date, due_time,
    start_date, estimated_duration_minutes, work_type, assigned_to, team_id, created_by
  ) values (
    target_work_order_id, target_organization_id, target_title, nullif(btrim(target_description), ''), target_priority,
    target_due_date, target_due_time, target_start_date, nullif(target_estimated_duration_minutes, 0),
    target_work_type, selected_user_id, selected_team_id, auth.uid()
  ) returning * into created_work_order;

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

    insert into public.work_order_assignments (organization_id, work_order_id, user_id, team_id)
    values (target_organization_id, target_work_order_id, selected_user_id, selected_team_id);
  end loop;

  for selected_attachment in select value from jsonb_array_elements(target_attachments)
  loop
    selected_storage_path := selected_attachment ->> 'storage_path';
    if split_part(selected_storage_path, '/', 1) <> target_organization_id::text
      or split_part(selected_storage_path, '/', 2) <> auth.uid()::text
      or split_part(selected_storage_path, '/', 3) <> target_work_order_id::text then
      raise exception 'Work Order attachment path must be scoped to this organization, uploader, and Work Order' using errcode = '42501';
    end if;
    if not exists (
      select 1 from storage.objects objects
      where objects.bucket_id = 'work-order-attachments'
        and objects.name = selected_storage_path
    ) then
      raise exception 'Work Order attachment object was not uploaded';
    end if;
    if not public.can_add_work_order_attachment(target_work_order_id, target_organization_id) then
      raise exception 'You do not have permission to attach files to this Work Order' using errcode = '42501';
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
      coalesce((selected_attachment ->> 'is_thumbnail')::boolean, false),
      auth.uid()
    );
  end loop;

  return to_jsonb(created_work_order);
end;
$$;

revoke execute on function public.create_work_order_with_assignments(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb) from public;
grant execute on function public.create_work_order_with_assignments(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';

select 'Work Order creation RPC authorization hardened' as result;
