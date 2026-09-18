alter table public.organizations
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.organization_members
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.profiles
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.user_preferences
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.organization_invitations
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  if auth.uid() is not null then
    new.updated_by = auth.uid();
  end if;
  return new;
end;
$$;
