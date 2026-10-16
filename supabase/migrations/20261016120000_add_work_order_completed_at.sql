alter table public.work_orders
  add column if not exists completed_at timestamptz;

update public.work_orders
set completed_at = coalesce(completed_at, updated_at)
where status = 'Completed' and completed_at is null;

create index if not exists work_orders_completed_at_idx
  on public.work_orders(organization_id, completed_at desc)
  where status = 'Completed';

create or replace function public.set_work_order_completed_at()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  if new.status = 'Completed' and (tg_op = 'INSERT' or old.status is distinct from new.status) then new.completed_at = coalesce(new.completed_at, now());
  elsif new.status <> 'Completed' and old.status = 'Completed' then new.completed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists work_orders_set_completed_at on public.work_orders;
create trigger work_orders_set_completed_at before update on public.work_orders
for each row execute function public.set_work_order_completed_at();
