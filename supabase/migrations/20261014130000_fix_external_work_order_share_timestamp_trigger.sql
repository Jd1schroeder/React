-- The generic repository timestamp trigger is not safe for this table because
-- deployed versions may also assign updated_by. External share rows are
-- server-managed and only need their own updated_at timestamp.
create or replace function public.set_external_work_order_share_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_external_work_order_share_updated_at() from public;

drop trigger if exists work_order_external_shares_set_updated_at on public.work_order_external_shares;
create trigger work_order_external_shares_set_updated_at
before update on public.work_order_external_shares
for each row execute function public.set_external_work_order_share_updated_at();

notify pgrst, 'reload schema';
