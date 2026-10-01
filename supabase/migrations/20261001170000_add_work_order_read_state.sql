-- Track whether each user has opened each Work Order.
create table if not exists public.work_order_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, work_order_id)
);

create index if not exists work_order_reads_work_order_id_idx
  on public.work_order_reads (work_order_id);

alter table public.work_order_reads enable row level security;

revoke all on public.work_order_reads from public, anon, authenticated;
grant select on public.work_order_reads to authenticated;

drop policy if exists "Users can view their permitted Work Order read state" on public.work_order_reads;
create policy "Users can view their permitted Work Order read state"
  on public.work_order_reads for select to authenticated
  using (
    user_id = auth.uid()
    and public.has_work_order_permission(work_order_id, 'work_orders.view')
  );

create or replace function public.mark_work_order_read(target_work_order_id uuid)
returns timestamptz
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  marked_at timestamptz;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to review Work Orders' using errcode = '42501';
  end if;

  if not public.has_work_order_permission(target_work_order_id, 'work_orders.view') then
    raise exception 'You do not have permission to view this Work Order' using errcode = '42501';
  end if;

  insert into public.work_order_reads (user_id, work_order_id, read_at)
  values (current_user_id, target_work_order_id, now())
  on conflict (user_id, work_order_id)
  do update set read_at = excluded.read_at
  returning read_at into marked_at;

  return marked_at;
end;
$$;

revoke execute on function public.mark_work_order_read(uuid) from public, anon;
grant execute on function public.mark_work_order_read(uuid) to authenticated;

notify pgrst, 'reload schema';
