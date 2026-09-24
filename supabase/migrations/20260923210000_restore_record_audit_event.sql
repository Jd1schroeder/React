-- Restore the audit RPC for deployments where the original audit hardening
-- migration was skipped or applied before the current role foundation.
create or replace function public.record_audit_event(
  target_organization_id uuid,
  event_action text,
  event_entity_type text,
  event_entity_id uuid default null,
  event_metadata jsonb default '{}'::jsonb
)
returns public.audit_events
language plpgsql
security definer
set search_path = public
as $$
declare
  recorded_event public.audit_events;
begin
  if not public.has_organization_permission(target_organization_id, 'organization.reporting_view') then
    raise exception 'You do not have permission to record organization audit events';
  end if;

  insert into public.audit_events (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (target_organization_id, auth.uid(), event_action, event_entity_type, event_entity_id, event_metadata)
  returning * into recorded_event;

  return recorded_event;
end;
$$;

revoke execute on function public.record_audit_event(uuid, text, text, uuid, jsonb) from public;
grant execute on function public.record_audit_event(uuid, text, text, uuid, jsonb) to authenticated;
