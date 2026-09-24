drop policy if exists "Organization admins can add members" on public.organization_members;
create policy "Organization admins can add members"
  on public.organization_members for insert to authenticated
  with check (public.has_organization_permission(organization_id, 'organization.invite_users'));

drop policy if exists "Organization admins can update members" on public.organization_members;
create policy "Organization admins can update members"
  on public.organization_members for update to authenticated
  using (public.has_organization_permission(organization_id, 'organization.edit_user_roles'))
  with check (public.has_organization_permission(organization_id, 'organization.edit_user_roles'));

drop policy if exists "Organization admins can remove members" on public.organization_members;
create policy "Organization admins can remove members"
  on public.organization_members for delete to authenticated
  using (public.has_organization_permission(organization_id, 'organization.remove_users'));

drop policy if exists "Organization admins can create invitations" on public.organization_invitations;
create policy "Organization admins can create invitations"
  on public.organization_invitations for insert to authenticated
  with check (public.has_organization_permission(organization_id, 'organization.invite_users') and invited_by = auth.uid());
