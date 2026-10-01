create or replace function public.mark_work_order_unread(target_work_order_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to update Work Order review state' using errcode = '42501';
  end if;
  if not public.has_work_order_permission(target_work_order_id, 'work_orders.view') then
    raise exception 'You do not have permission to view this Work Order' using errcode = '42501';
  end if;

  delete from public.work_order_reads
  where user_id = auth.uid()
    and work_order_id = target_work_order_id;
end;
$$;

create or replace function public.mark_work_order_inbox_read(
  target_organization_id uuid,
  target_tab text,
  target_search text default null
)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_search text := nullif(btrim(target_search), '');
  inserted_count integer;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to review Work Orders' using errcode = '42501';
  end if;
  if target_tab is null or target_tab not in ('To Do', 'Done') then
    raise exception 'Invalid Work Order Inbox tab';
  end if;

  with visible_work_orders as materialized (
    select work_orders.id
    from public.work_orders work_orders
    where work_orders.organization_id = target_organization_id
      and case
        when target_tab = 'Done' then work_orders.status = 'Completed'
        else work_orders.status <> 'Completed'
      end
      and (
        normalized_search is null
        or position(lower(normalized_search) in lower(work_orders.title)) > 0
        or position(lower(normalized_search) in work_orders.id::text) > 0
        or position(lower(normalized_search) in work_orders.work_order_number::text) > 0
      )
      and public.has_work_order_permission(work_orders.id, 'work_orders.view')
  ), inserted_reads as (
    insert into public.work_order_reads (user_id, work_order_id)
    select current_user_id, visible_work_orders.id
    from visible_work_orders
    on conflict (user_id, work_order_id) do nothing
    returning 1
  )
  select count(*) into inserted_count from inserted_reads;

  return inserted_count;
end;
$$;

revoke execute on function public.mark_work_order_unread(uuid) from public, anon;
revoke execute on function public.mark_work_order_inbox_read(uuid, text, text) from public, anon;
grant execute on function public.mark_work_order_unread(uuid) to authenticated;
grant execute on function public.mark_work_order_inbox_read(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
