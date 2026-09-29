-- Validate cached access tokens against the server-side Auth session registry.

create or replace function public.is_current_user_session_valid(target_session_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select auth.uid() is not null
    and target_session_id is not null
    and exists (
      select 1
      from auth.sessions
      where id = target_session_id
        and user_id = auth.uid()
    );
$$;

revoke execute on function public.is_current_user_session_valid(uuid) from public, anon;
grant execute on function public.is_current_user_session_valid(uuid) to authenticated;

select 'current session validation installed' as result;
