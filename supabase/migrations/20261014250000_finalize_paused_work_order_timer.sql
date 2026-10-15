-- Allow Stop to finalize a timer after it has been paused.
-- A paused entry has already recorded its active interval, so finalizing it
-- must not add elapsed time a second time.

create or replace function public.pause_work_order_timer(target_time_entry_id uuid, finalize boolean default false)
returns public.work_order_time_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  paused_entry public.work_order_time_entries;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to track Work Order time' using errcode = '42501';
  end if;

  update public.work_order_time_entries
  set duration_seconds = duration_seconds + case
        when status = 'running' and active_started_at is not null
          then greatest(0, floor(extract(epoch from (now() - active_started_at)))::integer)
        else 0
      end,
      active_started_at = null,
      status = case when finalize then 'completed' else 'paused' end,
      completed_at = case when finalize then now() else null end,
      updated_at = now()
  where id = target_time_entry_id
    and (
      (status = 'running' and active_started_at is not null)
      or (finalize and status = 'paused' and active_started_at is null)
    )
    and (user_id = current_user_id or public.is_organization_admin(organization_id))
    and public.has_work_order_permission(work_order_id, 'work_orders.view');

  if not found then
    raise exception 'Running timer could not be updated';
  end if;

  select * into paused_entry
  from public.work_order_time_entries
  where id = target_time_entry_id;
  return paused_entry;
end;
$$;

