-- Use a distinct RPC name for custom-field-aware Work Order creation. The
-- original function has overloaded signatures that PostgreSQL can resolve
-- ambiguously when default arguments are present.
drop function if exists public.create_work_order_with_custom_fields(
  uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb, jsonb
);

create or replace function public.create_work_order_with_custom_fields(
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
  target_attachments jsonb default '[]'::jsonb,
  target_custom_field_values jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  created_work_order public.work_orders;
  configured_field jsonb;
  field_id text;
  field_value jsonb;
  selected_assignment jsonb;
  selected_user_id uuid;
  selected_team_id uuid;
  selected_attachment jsonb;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a Work Order' using errcode = '42501';
  end if;
  if not public.has_organization_permission(target_organization_id, 'work_orders.create', 'own') then
    raise exception 'You do not have permission to create Work Orders in this organization' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(target_assignments, '[]'::jsonb)) <> 'array' or jsonb_typeof(coalesce(target_attachments, '[]'::jsonb)) <> 'array' then
    raise exception 'Assignments and attachments must be arrays';
  end if;
  if jsonb_typeof(coalesce(target_custom_field_values, '{}'::jsonb)) <> 'object' then
    raise exception 'Custom field values must be an object';
  end if;

  for configured_field in
    select value
    from public.organizations organizations,
      jsonb_array_elements(coalesce(organizations.work_order_settings -> 'workOrderFields' -> 'customFields', '[]'::jsonb)) as fields(value)
    where organizations.id = target_organization_id
      and coalesce((fields.value ->> 'required')::boolean, false)
  loop
    field_id := nullif(configured_field ->> 'id', '');
    field_value := target_custom_field_values -> field_id;
    if field_id is not null and (
      field_value is null
      or field_value = 'null'::jsonb
      or (jsonb_typeof(field_value) = 'string' and btrim(field_value #>> '{}') = '')
      or (jsonb_typeof(field_value) = 'array' and jsonb_array_length(field_value) = 0)
    ) then
      raise exception 'The required custom field "%" must be completed', coalesce(configured_field ->> 'name', field_id);
    end if;
  end loop;

  select nullif(assignment.value ->> 'user_id', '')::uuid into selected_user_id
  from jsonb_array_elements(target_assignments) as assignment(value)
  where nullif(assignment.value ->> 'user_id', '') is not null
  limit 1;
  select nullif(assignment.value ->> 'team_id', '')::uuid into selected_team_id
  from jsonb_array_elements(target_assignments) as assignment(value)
  where nullif(assignment.value ->> 'team_id', '') is not null
  limit 1;

  insert into public.work_orders (
    id, organization_id, title, description, priority, due_date, due_time,
    start_date, estimated_duration_minutes, work_type, assigned_to, team_id,
    created_by, custom_field_values
  ) values (
    target_work_order_id, target_organization_id, target_title, nullif(btrim(target_description), ''), target_priority,
    target_due_date, target_due_time, target_start_date, nullif(target_estimated_duration_minutes, 0),
    target_work_type, selected_user_id, selected_team_id, auth.uid(), coalesce(target_custom_field_values, '{}'::jsonb)
  ) returning * into created_work_order;

  for selected_assignment in select value from jsonb_array_elements(target_assignments)
  loop
    insert into public.work_order_assignments (organization_id, work_order_id, user_id, team_id)
    values (target_organization_id, target_work_order_id, nullif(selected_assignment ->> 'user_id', '')::uuid, nullif(selected_assignment ->> 'team_id', '')::uuid);
  end loop;

  for selected_attachment in select value from jsonb_array_elements(target_attachments)
  loop
    insert into public.work_order_attachments (
      id, organization_id, work_order_id, kind, storage_path, file_name,
      content_type, byte_size, is_thumbnail, uploaded_by
    ) values (
      (selected_attachment ->> 'id')::uuid, target_organization_id, target_work_order_id,
      selected_attachment ->> 'kind', selected_attachment ->> 'storage_path', selected_attachment ->> 'file_name',
      coalesce(nullif(selected_attachment ->> 'content_type', ''), 'application/octet-stream'),
      (selected_attachment ->> 'byte_size')::bigint, coalesce((selected_attachment ->> 'is_thumbnail')::boolean, false), auth.uid()
    );
  end loop;

  return to_jsonb(created_work_order);
end;
$$;

revoke execute on function public.create_work_order_with_custom_fields(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.create_work_order_with_custom_fields(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
