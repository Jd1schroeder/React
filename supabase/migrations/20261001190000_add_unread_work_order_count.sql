create or replace function public.get_unread_work_order_count(target_organization_id uuid)
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)
  from public.work_orders work_orders
  where auth.uid() is not null
    and work_orders.organization_id = target_organization_id
    and not exists (
      select 1
      from public.work_order_reads reads
      where reads.work_order_id = work_orders.id
        and reads.user_id = auth.uid()
    );
$$;

revoke execute on function public.get_unread_work_order_count(uuid) from public, anon;
grant execute on function public.get_unread_work_order_count(uuid) to authenticated;

notify pgrst, 'reload schema';
