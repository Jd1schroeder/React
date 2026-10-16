alter table public.organization_teams
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

