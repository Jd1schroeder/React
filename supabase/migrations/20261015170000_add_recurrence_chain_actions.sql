-- Add permission-checked chain controls for recurring Work Orders.

create or replace function public.stop_work_order_recurrence(
  target_work_order_id uuid,
  target_organization_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_series_id uuid;
  stopped_count integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to stop Work Order recurrence' using errcode = '42501';
  end if;
  if not public.has_work_order_permission(target_work_order_id, 'work_orders.edit') then
    raise exception 'You do not have permission to stop Work Order recurrence' using errcode = '42501';
  end if;

  select recurrence_series_id into target_series_id
  from public.work_orders
  where id = target_work_order_id and organization_id = target_organization_id;
  if target_series_id is null then
    raise exception 'Work Order not found in this organization';
  end if;

  perform set_config('workbench.internal_recurrence_stop', 'true', true);
  update public.work_orders
  set recurrence_rule = null
  where organization_id = target_organization_id
    and recurrence_series_id = target_series_id
    and recurrence_rule is not null;
  get diagnostics stopped_count = row_count;
  return stopped_count;
end;
$$;

create or replace function public.enforce_work_order_recurrence_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('workbench.internal_recurrence_stop', true), '') = 'true' then
    return new;
  end if;
  if auth.uid() is not null
     and old.recurrence_rule is distinct from new.recurrence_rule
     and not public.has_work_order_permission(old.id, 'work_orders.edit') then
    raise exception 'You do not have permission to edit Work Order recurrence' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.stop_work_order_recurrence(uuid, uuid) from public, anon;
grant execute on function public.stop_work_order_recurrence(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
