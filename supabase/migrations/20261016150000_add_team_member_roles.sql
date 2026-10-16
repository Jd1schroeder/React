alter table public.organization_team_members
  add column if not exists role text not null default 'member'
    check (role in ('member', 'admin'));

drop policy if exists "Authorized members can update team membership" on public.organization_team_members;
create policy "Authorized members can update team membership"
  on public.organization_team_members for update to authenticated
  using (public.has_organization_permission((select organization_id from public.organization_teams where id = organization_team_members.team_id), 'organization.edit_user_roles'))
  with check (public.has_organization_permission((select organization_id from public.organization_teams where id = organization_team_members.team_id), 'organization.edit_user_roles'));
