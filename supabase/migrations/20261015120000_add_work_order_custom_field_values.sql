alter table public.work_orders
  add column if not exists custom_field_values jsonb not null default '{}'::jsonb;

alter table public.work_orders
  drop constraint if exists work_orders_custom_field_values_object_check;

alter table public.work_orders
  add constraint work_orders_custom_field_values_object_check
  check (jsonb_typeof(custom_field_values) = 'object');

-- The additional argument keeps custom-field values in the same transaction as
-- the existing Work Order creation RPC. Definitions remain organization-owned
-- in organizations.work_order_settings; values are keyed by definition ID.
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
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a Work Order' using errcode = '42501';
  end if;
  if not public.has_organization_permission(target_organization_id, 'work_orders.create', 'own') then
    raise exception 'You do not have permission to create Work Orders in this organization' using errcode = '42501';
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

  perform public.create_work_order_with_assignments(
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

  update public.work_orders
  set custom_field_values = coalesce(target_custom_field_values, '{}'::jsonb)
  where id = target_work_order_id
    and organization_id = target_organization_id;

  select * into created_work_order
  from public.work_orders
  where id = target_work_order_id
    and organization_id = target_organization_id;

  return to_jsonb(created_work_order);
end;
$$;

revoke execute on function public.create_work_order_with_assignments(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.create_work_order_with_assignments(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
