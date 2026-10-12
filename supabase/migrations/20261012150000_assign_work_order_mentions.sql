create or replace function public.create_work_order_comment_with_mentions(
  target_organization_id uuid,
  target_work_order_id uuid,
  target_comment_id uuid,
  target_body text default null,
  target_attachments jsonb default '[]'::jsonb,
  target_mentioned_user_ids uuid[] default '{}'::uuid[],
  target_mentioned_team_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  created_comment jsonb;
  assignments jsonb;
  mentions_enabled boolean;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to comment on a Work Order' using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.work_orders work_orders
    where work_orders.id = target_work_order_id
      and work_orders.organization_id = target_organization_id
  ) then
    raise exception 'Work Order not found in this organization';
  end if;
  if not public.has_work_order_permission(target_work_order_id, 'work_orders.post_comments') then
    raise exception 'You do not have permission to comment on this Work Order' using errcode = '42501';
  end if;

  select coalesce((organizations.work_order_settings ->> 'assignUsersTeamsOnMention')::boolean, true)
    into mentions_enabled
  from public.organizations organizations
  where organizations.id = target_organization_id;

  created_comment := public.create_work_order_comment(
    target_organization_id,
    target_work_order_id,
    target_comment_id,
    target_body,
    target_attachments
  );

  if mentions_enabled then
    insert into public.work_order_assignments (organization_id, work_order_id, user_id)
    select target_organization_id, target_work_order_id, members.user_id
    from public.organization_members members
    where members.organization_id = target_organization_id
      and members.status = 'active'
      and members.user_id = any(coalesce(target_mentioned_user_ids, '{}'::uuid[]))
    on conflict do nothing;

    insert into public.work_order_assignments (organization_id, work_order_id, team_id)
    select target_organization_id, target_work_order_id, teams.id
    from public.organization_teams teams
    where teams.organization_id = target_organization_id
      and teams.id = any(coalesce(target_mentioned_team_ids, '{}'::uuid[]))
    on conflict do nothing;
  end if;

  select coalesce(jsonb_agg(to_jsonb(work_order_assignments) order by work_order_assignments.created_at), '[]'::jsonb)
    into assignments
  from public.work_order_assignments work_order_assignments
  where work_order_assignments.organization_id = target_organization_id
    and work_order_assignments.work_order_id = target_work_order_id;

  return jsonb_build_object('comment', created_comment, 'assignments', assignments);
end;
$$;

revoke execute on function public.create_work_order_comment_with_mentions(uuid, uuid, uuid, text, jsonb, uuid[], uuid[]) from public, anon;
grant execute on function public.create_work_order_comment_with_mentions(uuid, uuid, uuid, text, jsonb, uuid[], uuid[]) to authenticated;

notify pgrst, 'reload schema';
