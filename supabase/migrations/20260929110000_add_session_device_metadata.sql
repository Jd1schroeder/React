alter table public.user_sessions
  add column if not exists browser_name text not null default 'Browser',
  add column if not exists operating_system text not null default 'Unknown',
  add column if not exists last_ip inet;

drop function if exists public.upsert_current_user_session(uuid, text, text, text, text);

create or replace function public.upsert_current_user_session(
  target_session_id uuid,
  target_device_id text,
  target_device_name text,
  target_device_type text,
  target_browser_name text,
  target_operating_system text,
  target_ip inet,
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
    session_id, user_id, device_id, device_name, device_type,
    browser_name, operating_system, last_ip, user_agent, session_ids,
    last_connection, updated_at
  ) values (
    target_session_id,
    auth.uid(),
    left(target_device_id, 120),
    left(coalesce(nullif(trim(target_device_name), ''), 'Unknown device'), 120),
    target_device_type,
    left(coalesce(nullif(trim(target_browser_name), ''), 'Browser'), 80),
    left(coalesce(nullif(trim(target_operating_system), ''), 'Unknown'), 80),
    target_ip,
    left(target_user_agent, 500),
    array[target_session_id],
    now(),
    now()
  )
  on conflict (user_id, device_id) do update
    set session_id = excluded.session_id,
        device_name = excluded.device_name,
        device_type = excluded.device_type,
        browser_name = excluded.browser_name,
        operating_system = excluded.operating_system,
        last_ip = excluded.last_ip,
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

revoke execute on function public.upsert_current_user_session(uuid, text, text, text, text, text, inet, text) from public, anon;
grant execute on function public.upsert_current_user_session(uuid, text, text, text, text, text, inet, text) to authenticated;

select 'session device metadata installed' as result;
