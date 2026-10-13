-- Apply the organization-level To Do start-date preference to every inbox
-- operation that uses the shared Work Order filter predicate.
alter function public.work_order_matches_inbox_filters(public.work_orders, jsonb)
  rename to work_order_matches_inbox_filters_base;

create or replace function public.work_order_matches_inbox_filters(
  target_order public.work_orders,
  target_filters jsonb
)
returns boolean
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  organization_timezone text;
  show_todo_by_start_date_only boolean;
begin
  select
    coalesce(nullif(organizations.timezone, ''), 'UTC'),
    (organizations.work_order_settings ->> 'showToDoByStartDateOnly') = 'true'
  into organization_timezone, show_todo_by_start_date_only
  from public.organizations
  where organizations.id = target_order.organization_id;

  if coalesce(show_todo_by_start_date_only, false)
    and target_order.status <> 'Completed'
    and target_order.start_date > (now() at time zone coalesce(organization_timezone, 'UTC'))::date then
    return false;
  end if;

  return public.work_order_matches_inbox_filters_base(target_order, target_filters);
end;
$$;

revoke all on function public.work_order_matches_inbox_filters_base(public.work_orders, jsonb) from public, anon;
revoke all on function public.work_order_matches_inbox_filters(public.work_orders, jsonb) from public, anon;
grant execute on function public.work_order_matches_inbox_filters_base(public.work_orders, jsonb) to authenticated;
grant execute on function public.work_order_matches_inbox_filters(public.work_orders, jsonb) to authenticated;

notify pgrst, 'reload schema';
