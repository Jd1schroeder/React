create or replace function public.get_organization_member_last_visits(target_organization_id uuid)
returns table (user_id uuid, last_sign_in_at timestamptz)
language sql
security definer
set search_path = public, auth
as $$
  select users.id, users.last_sign_in_at
  from auth.users as users
  where public.is_organization_admin(target_organization_id)
    and exists (
      select 1
      from public.organization_members as members
      where members.organization_id = target_organization_id
        and members.user_id = users.id
    );
$$;

revoke all on function public.get_organization_member_last_visits(uuid) from public;
grant execute on function public.get_organization_member_last_visits(uuid) to authenticated;
