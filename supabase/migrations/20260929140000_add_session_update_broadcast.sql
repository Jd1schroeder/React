-- Notify a user's connected clients when linked-device metadata changes.

create or replace function public.broadcast_session_change()
returns trigger
security definer
set search_path = ''
language plpgsql
as $$
begin
  perform realtime.send(
    '{}'::jsonb,
    'session-updated',
    'user-session:' || coalesce(new.user_id, old.user_id)::text,
    true
  );
  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists user_sessions_change_broadcast on public.user_sessions;
create trigger user_sessions_change_broadcast
after insert or update on public.user_sessions
for each row
execute function public.broadcast_session_change();

select 'session update broadcast installed' as result;
