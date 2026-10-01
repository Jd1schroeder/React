-- Apply unread-first ordering before server-side pagination so each page stays
-- globally ordered and the current user's read state remains authoritative.
drop function if exists public.get_work_order_inbox_page(uuid, text, text, text, text, integer, integer);

create function public.get_work_order_inbox_page(
  target_organization_id uuid,
  target_tab text,
  target_group text,
  target_search text,
  target_sort text,
  target_offset integer,
  target_page_size integer default 50,
  target_unread_first boolean default false
)
returns setof public.work_orders
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  normalized_search text := nullif(btrim(target_search), '');
  safe_offset integer := greatest(coalesce(target_offset, 0), 0);
  safe_page_size integer := least(greatest(coalesce(target_page_size, 50), 1), 50);
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to view Work Orders' using errcode = '42501';
  end if;
  if target_tab is null or target_tab not in ('To Do', 'Done') then
    raise exception 'Invalid Work Order Inbox tab';
  end if;
  if target_group is null or target_group not in ('assigned-to-me', 'assigned-to-my-teams', 'created-by-me', 'all-open', 'completed') then
    raise exception 'Invalid Work Order Inbox group';
  end if;
  if target_sort is null or target_sort not in ('created-oldest', 'created-newest', 'due-earliest', 'due-latest', 'updated-oldest', 'updated-newest', 'priority-highest', 'priority-lowest') then
    raise exception 'Invalid Work Order sort';
  end if;

  return query
  with filtered as materialized (
    select work_orders.*
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
      and case target_group
        when 'assigned-to-me' then target_tab = 'To Do' and (
          work_orders.assigned_to = auth.uid()
          or exists (
            select 1 from public.work_order_assignments assignments
            where assignments.work_order_id = work_orders.id
              and assignments.user_id = auth.uid()
          )
        )
        when 'assigned-to-my-teams' then target_tab = 'To Do' and (
          exists (
            select 1
            from public.work_order_assignments assignments
            join public.organization_team_members team_members
              on team_members.team_id = assignments.team_id
             and team_members.user_id = auth.uid()
            join public.organization_teams teams
              on teams.id = team_members.team_id
             and teams.organization_id = target_organization_id
            where assignments.work_order_id = work_orders.id
          ) or exists (
            select 1
            from public.organization_team_members team_members
            join public.organization_teams teams
              on teams.id = team_members.team_id
             and teams.organization_id = target_organization_id
            where team_members.team_id = work_orders.team_id
              and team_members.user_id = auth.uid()
          )
        )
        when 'created-by-me' then target_tab = 'To Do' and work_orders.created_by = auth.uid()
        when 'all-open' then target_tab = 'To Do'
        when 'completed' then target_tab = 'Done'
        else false
      end
  )
  select filtered.*
  from filtered
  order by
    case
      when target_unread_first and not exists (
        select 1
        from public.work_order_reads reads
        where reads.work_order_id = filtered.id
          and reads.user_id = auth.uid()
      ) then 0
      else 1
    end asc,
    case when target_sort = 'created-oldest' then filtered.created_at end asc nulls last,
    case when target_sort = 'created-newest' then filtered.created_at end desc nulls last,
    case when target_sort = 'due-earliest' then filtered.due_date end asc nulls last,
    case when target_sort = 'due-latest' then filtered.due_date end desc nulls last,
    case when target_sort = 'due-earliest' then coalesce(filtered.due_time, time '23:59:59') end asc nulls last,
    case when target_sort = 'due-latest' then coalesce(filtered.due_time, time '23:59:59') end desc nulls last,
    case when target_sort = 'updated-oldest' then filtered.updated_at end asc nulls last,
    case when target_sort = 'updated-newest' then filtered.updated_at end desc nulls last,
    case when target_sort = 'priority-highest' then
      case filtered.priority when 'Urgent' then 0 when 'High' then 1 when 'Medium' then 2 when 'Low' then 3 else 4 end
    end asc nulls last,
    case when target_sort = 'priority-lowest' then
      case filtered.priority when 'Low' then 0 when 'Medium' then 1 when 'High' then 2 when 'Urgent' then 3 else 4 end
    end asc nulls last,
    filtered.work_order_number asc
  offset safe_offset
  limit safe_page_size;
end;
$$;

revoke execute on function public.get_work_order_inbox_page(uuid, text, text, text, text, integer, integer, boolean) from public, anon;
grant execute on function public.get_work_order_inbox_page(uuid, text, text, text, text, integer, integer, boolean) to authenticated;

notify pgrst, 'reload schema';
