-- The composite primary key already indexes organization_id first. Add the
-- reverse lookup used when loading all organizations for a user.
create index if not exists organization_members_user_id_idx
  on public.organization_members(user_id);
