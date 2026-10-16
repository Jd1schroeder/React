alter table public.organization_teams
  add column if not exists description text check (description is null or char_length(description) <= 240),
  add column if not exists color text not null default '#1887fc' check (color ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists is_escalation_team boolean not null default false,
  add column if not exists escalation_events text[] not null default '{}';

select 'team metadata fields installed' as result;
