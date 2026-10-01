-- Give each organization a stable, human-readable Work Order number while
-- retaining UUIDs as the internal primary key and route identifier.
alter table public.organizations
  add column if not exists work_order_start_number bigint not null default 1
  check (work_order_start_number > 0);

alter table public.work_orders
  add column if not exists work_order_number bigint;

with numbered_work_orders as (
  select id,
         row_number() over (partition by organization_id order by created_at, id) as work_order_number
  from public.work_orders
)
update public.work_orders work_orders
set work_order_number = numbered_work_orders.work_order_number
from numbered_work_orders
where work_orders.id = numbered_work_orders.id
  and work_orders.work_order_number is null;

alter table public.work_orders
  alter column work_order_number set not null;

create unique index if not exists work_orders_organization_number_idx
  on public.work_orders (organization_id, work_order_number);

create table if not exists public.work_order_number_counters (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  last_number bigint not null check (last_number > 0)
);

insert into public.work_order_number_counters as counters (organization_id, last_number)
select organization_id, max(work_order_number)
from public.work_orders
group by organization_id
on conflict (organization_id) do update
set last_number = greatest(counters.last_number, excluded.last_number);

alter table public.work_order_number_counters enable row level security;
revoke all on public.work_order_number_counters from anon, authenticated;

create or replace function public.assign_work_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.work_order_number_counters as counters (organization_id, last_number)
    values (
      new.organization_id,
      (select organizations.work_order_start_number
       from public.organizations
       where organizations.id = new.organization_id)
    )
    on conflict (organization_id) do update
      set last_number = greatest(counters.last_number + 1, excluded.last_number)
    returning last_number into new.work_order_number;
  elsif old.work_order_number is distinct from new.work_order_number then
    raise exception 'Work Order number cannot be changed';
  end if;

  return new;
end;
$$;

revoke execute on function public.assign_work_order_number() from public, anon, authenticated;

drop trigger if exists work_orders_assign_number on public.work_orders;
create trigger work_orders_assign_number
before insert or update of work_order_number on public.work_orders
for each row execute function public.assign_work_order_number();

notify pgrst, 'reload schema';
