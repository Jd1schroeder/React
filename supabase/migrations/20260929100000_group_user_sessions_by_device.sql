-- MaintainX-style device rows group multiple Auth sessions from the same browser/device.

delete from public.user_sessions;

alter table public.user_sessions
  add column if not exists device_id text,
  add column if not exists session_ids uuid[] not null default '{}';

alter table public.user_sessions
  alter column device_id set not null;

create unique index if not exists user_sessions_user_device_idx
  on public.user_sessions(user_id, device_id);

drop function if exists public.upsert_current_user_session(uuid, text, text, text);

create or replace function public.upsert_current_user_session(
  target_session_id uuid,
  target_device_id text,
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

  if target_session_id is null or target_device_id is null or not exists (
    select 1 from auth.sessions
    where id = target_session_id and user_id = auth.uid()
  ) then
    raise exception 'The session does not belong to the signed-in user';
  end if;

  insert into public.user_sessions (
    session_id, user_id, device_id, device_name, device_type, user_agent, session_ids, last_connection, updated_at
  ) values (
    target_session_id,
    auth.uid(),
    left(target_device_id, 120),
    left(coalesce(nullif(trim(target_device_name), ''), 'Unknown device'), 120),
    target_device_type,
    left(target_user_agent, 500),
    array[target_session_id],
    now(),
    now()
  )
  on conflict (user_id, device_id) do update
    set session_id = excluded.session_id,
        device_name = excluded.device_name,
        device_type = excluded.device_type,
        user_agent = excluded.user_agent,
        session_ids = array(
          select distinct session_id
          from unnest(public.user_sessions.session_ids || excluded.session_ids) as sessions(session_id)
        ),
        last_connection = now(),
        updated_at = now()
  returning * into current_session;

  return current_session;
end;
$$;

create or replace function public.revoke_current_user_session(target_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_sessions uuid[];
  revoked boolean := false;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to revoke a session';
  end if;

  select session_ids into target_sessions
  from public.user_sessions
  where session_id = target_session_id
    and user_id = auth.uid();

  if target_sessions is null then
    return false;
  end if;

  delete from auth.sessions
  where user_id = auth.uid() and id = any(target_sessions);
  revoked := found;

  delete from public.user_sessions
  where session_id = target_session_id and user_id = auth.uid();

  return revoked;
end;
$$;

revoke execute on function public.upsert_current_user_session(uuid, text, text, text, text) from public, anon;
grant execute on function public.upsert_current_user_session(uuid, text, text, text, text) to authenticated;
revoke execute on function public.revoke_current_user_session(uuid) from public, anon;
grant execute on function public.revoke_current_user_session(uuid) to authenticated;

select 'user sessions grouped by device' as result;
