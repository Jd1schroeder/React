-- Keep the configurable Work Order starting number at or above the next
-- number available in the organization's existing sequence.
create or replace function public.get_next_work_order_number(target_organization_id uuid)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  configured_start bigint;
  counter_next bigint;
  highest_next bigint;
begin
  if not public.is_organization_admin(target_organization_id) then
    raise exception 'You do not have permission to manage Work Order numbering' using errcode = '42501';
  end if;

  select work_order_start_number
    into configured_start
  from public.organizations
  where id = target_organization_id;

  if not found then
    raise exception 'Organization not found';
  end if;

  select last_number + 1
    into counter_next
  from public.work_order_number_counters
  where organization_id = target_organization_id;

  select max(work_order_number) + 1
    into highest_next
  from public.work_orders
  where organization_id = target_organization_id;

  return greatest(coalesce(configured_start, 1), coalesce(counter_next, 1), coalesce(highest_next, 1));
end;
$$;

create or replace function public.validate_work_order_start_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  minimum_start bigint;
begin
  if new.work_order_start_number is null or new.work_order_start_number <= 0 then
    raise exception 'Work Order starting ID must be greater than zero';
  end if;

  select greatest(
    coalesce((select counters.last_number + 1 from public.work_order_number_counters counters where counters.organization_id = new.id), 1),
    coalesce((select max(work_orders.work_order_number) + 1 from public.work_orders where work_orders.organization_id = new.id), 1)
  )
    into minimum_start;

  if new.work_order_start_number < minimum_start then
    raise exception 'Work Order starting ID must be at least %', minimum_start;
  end if;

  return new;
end;
$$;

drop trigger if exists organizations_validate_work_order_start_number on public.organizations;
create trigger organizations_validate_work_order_start_number
before insert or update of work_order_start_number on public.organizations
for each row execute function public.validate_work_order_start_number();

create or replace function public.set_work_order_start_number(
  target_organization_id uuid,
  target_start_number bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_organization_admin(target_organization_id) then
    raise exception 'You do not have permission to manage Work Order numbering' using errcode = '42501';
  end if;

  update public.organizations
  set work_order_start_number = target_start_number
  where id = target_organization_id;

  if not found then
    raise exception 'Organization not found';
  end if;

  return target_start_number;
end;
$$;

revoke execute on function public.get_next_work_order_number(uuid) from public, anon;
grant execute on function public.get_next_work_order_number(uuid) to authenticated;
revoke execute on function public.set_work_order_start_number(uuid, bigint) from public, anon;
grant execute on function public.set_work_order_start_number(uuid, bigint) to authenticated;

notify pgrst, 'reload schema';
