create table if not exists public.user_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null check (char_length(device_name) between 1 and 120),
  device_type text not null check (device_type in ('browser', 'mobile', 'tablet', 'desktop')),
  user_agent text,
  created_at timestamptz not null default now(),
  last_connection timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_sessions_user_last_connection_idx
  on public.user_sessions(user_id, last_connection desc);

alter table public.user_sessions enable row level security;

create or replace function public.upsert_current_user_session(
  target_session_id uuid,
  target_device_name text,
  target_device_type text,
  target_user_agent text default null
)
returns public.user_sessions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_session public.user_sessions;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to register a session';
  end if;

  if target_session_id is null or not exists (
    select 1 from auth.sessions
    where id = target_session_id and user_id = auth.uid()
  ) then
    raise exception 'The session does not belong to the signed-in user';
  end if;

  insert into public.user_sessions (
    session_id, user_id, device_name, device_type, user_agent, last_connection, updated_at
  ) values (
    target_session_id,
    auth.uid(),
    left(nullif(trim(target_device_name), ''), 120),
    target_device_type,
    left(target_user_agent, 500),
    now(),
    now()
  )
  on conflict (session_id) do update
    set device_name = excluded.device_name,
        device_type = excluded.device_type,
        user_agent = excluded.user_agent,
        last_connection = now(),
        updated_at = now()
  returning * into current_session;

  return current_session;
end;
$$;

create or replace function public.list_current_user_sessions()
returns setof public.user_sessions
language sql
security definer
set search_path = public
as $$
  select *
  from public.user_sessions
  where user_id = auth.uid()
  order by last_connection desc;
$$;

create or replace function public.revoke_current_user_session(target_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  revoked boolean := false;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to revoke a session';
  end if;

  if exists (
    select 1 from auth.sessions
    where id = target_session_id and user_id = auth.uid()
  ) then
    delete from auth.sessions
    where id = target_session_id and user_id = auth.uid();
    revoked := found;
  end if;

  delete from public.user_sessions
  where session_id = target_session_id and user_id = auth.uid();

  return revoked;
end;
$$;

revoke all on table public.user_sessions from public, anon, authenticated;
revoke execute on function public.upsert_current_user_session(uuid, text, text, text) from public, anon;
revoke execute on function public.list_current_user_sessions() from public, anon;
revoke execute on function public.revoke_current_user_session(uuid) from public, anon;
grant execute on function public.upsert_current_user_session(uuid, text, text, text) to authenticated;
grant execute on function public.list_current_user_sessions() to authenticated;
grant execute on function public.revoke_current_user_session(uuid) to authenticated;

select 'user session registry installed' as result;
