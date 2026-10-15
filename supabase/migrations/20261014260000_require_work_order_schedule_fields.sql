-- Enforce the organization Work Order scheduling policy for all detail writes,
-- including clients that do not use the Workbench form.
create or replace function public.enforce_work_order_schedule_requirement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requirement text;
begin
  select coalesce(work_order_settings ->> 'requiredSchedule', 'none')
    into requirement
  from public.organizations
  where id = new.organization_id;

  if requirement not in ('none', 'due_date', 'start_date', 'both') then
    requirement := 'none';
  end if;

  if requirement in ('due_date', 'both') and new.due_date is null then
    raise exception 'A due date is required by this organization''s Work Order settings';
  end if;
  if requirement in ('start_date', 'both') and new.start_date is null then
    raise exception 'A start date is required by this organization''s Work Order settings';
  end if;

  return new;
end;
$$;

drop trigger if exists work_orders_require_schedule_fields on public.work_orders;
create trigger work_orders_require_schedule_fields
before insert or update of title, description, priority, due_date, due_time, start_date,
  estimated_duration_minutes, work_type, assigned_to, team_id on public.work_orders
for each row execute function public.enforce_work_order_schedule_requirement();

revoke execute on function public.enforce_work_order_schedule_requirement() from public, anon, authenticated;

notify pgrst, 'reload schema';

select 'Work Order schedule requirements enforced' as result;
