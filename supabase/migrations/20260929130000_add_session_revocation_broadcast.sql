-- Notify a user's connected clients when one of their linked devices is revoked.

drop policy if exists "Users can receive session revocation broadcasts" on realtime.messages;
create policy "Users can receive session revocation broadcasts"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and realtime.topic() = 'user-session:' || (select auth.uid())::text
);

create or replace function public.broadcast_session_revocation()
returns trigger
security definer
set search_path = ''
language plpgsql
as $$
begin
  perform realtime.send(
    '{}'::jsonb,
    'session-revoked',
    'user-session:' || old.user_id::text,
    true
  );
  return old;
end;
$$;

drop trigger if exists user_sessions_revocation_broadcast on public.user_sessions;
create trigger user_sessions_revocation_broadcast
after delete on public.user_sessions
for each row
execute function public.broadcast_session_revocation();

select 'session revocation broadcast installed' as result;
