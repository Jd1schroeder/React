-- Capture role assignments and role-definition changes with before/after context.
-- This extends the existing audit_events model; it does not create a second log.

create or replace function public.audit_organization_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid;
  target_entity_id uuid;
  target_action text;
  target_entity_type text;
  target_metadata jsonb;
  previous_role_name text;
  next_role_name text;
begin
  if tg_table_name = 'organization_members' then
    target_organization_id := coalesce(new.organization_id, old.organization_id);
    target_entity_id := coalesce(new.user_id, old.user_id);
    target_entity_type := 'organization_member';
    if tg_op = 'UPDATE' and old.role_id is distinct from new.role_id then
      target_action := 'role_changed';
      select name into previous_role_name from public.organization_roles where id = old.role_id;
      select name into next_role_name from public.organization_roles where id = new.role_id;
      target_metadata := jsonb_build_object(
        'previous_role_id', old.role_id,
        'previous_role_name', previous_role_name,
        'role_id', new.role_id,
        'role_name', next_role_name,
        'previous_legacy_role', old.role,
        'legacy_role', new.role
      );
    elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
      target_action := 'status_changed';
      target_metadata := jsonb_build_object('previous_status', old.status, 'status', new.status, 'role_id', new.role_id);
    elsif tg_op = 'INSERT' then
      target_action := 'created';
      target_metadata := jsonb_build_object('role_id', new.role_id, 'role', new.role, 'status', new.status);
    elsif tg_op = 'DELETE' then
      target_action := 'deleted';
      target_metadata := jsonb_build_object('role_id', old.role_id, 'role', old.role, 'status', old.status);
    else
      target_action := 'updated';
      target_metadata := jsonb_build_object('role_id', new.role_id, 'role', new.role, 'status', new.status);
    end if;
  elsif tg_table_name = 'organization_roles' then
    target_organization_id := coalesce(new.organization_id, old.organization_id);
    target_entity_id := coalesce(new.id, old.id);
    target_entity_type := 'organization_role';
    if tg_op = 'INSERT' then
      target_action := 'created';
      target_metadata := jsonb_build_object('name', new.name, 'description', new.description, 'is_system', new.is_system, 'system_key', new.system_key);
    elsif tg_op = 'DELETE' then
      target_action := 'deleted';
      target_metadata := jsonb_build_object('name', old.name, 'description', old.description, 'is_system', old.is_system, 'system_key', old.system_key);
    else
      target_action := 'updated';
      target_metadata := jsonb_build_object(
        'previous_name', old.name,
        'name', new.name,
        'previous_description', old.description,
        'description', new.description,
        'is_system', new.is_system,
        'system_key', new.system_key
      );
    end if;
  elsif tg_table_name = 'organization_role_permissions' then
    target_organization_id := (select organization_id from public.organization_roles where id = coalesce(new.role_id, old.role_id));
    target_entity_id := coalesce(new.role_id, old.role_id);
    target_entity_type := 'organization_role_permission';
    if tg_op = 'INSERT' then
      target_action := 'permission_granted';
      target_metadata := jsonb_build_object('permission_key', new.permission_key, 'scope', new.scope);
    elsif tg_op = 'DELETE' then
      target_action := 'permission_revoked';
      target_metadata := jsonb_build_object('permission_key', old.permission_key, 'scope', old.scope);
    else
      target_action := 'permission_changed';
      target_metadata := jsonb_build_object('permission_key', new.permission_key, 'previous_scope', old.scope, 'scope', new.scope);
    end if;
  elsif tg_table_name = 'organizations' then
    target_organization_id := coalesce(new.id, old.id);
    target_entity_id := coalesce(new.id, old.id);
    target_entity_type := 'organization';
    target_action := 'updated';
    target_metadata := jsonb_build_object('name', new.name, 'status', new.status);
  else
    target_organization_id := coalesce(new.organization_id, old.organization_id);
    target_entity_id := coalesce(new.id, old.id);
    target_entity_type := 'organization_invitation';
    if tg_op = 'INSERT' then target_action := 'created';
    elsif tg_op = 'DELETE' then target_action := 'deleted';
    else target_action := coalesce(new.status, 'updated');
    end if;
    target_metadata := jsonb_build_object('contact_type', coalesce(new.contact_type, old.contact_type), 'role', coalesce(new.role, old.role), 'status', coalesce(new.status, old.status));
  end if;

  if auth.uid() is not null and target_organization_id is not null then
    insert into public.audit_events (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (target_organization_id, auth.uid(), target_action, target_entity_type, target_entity_id, coalesce(target_metadata, '{}'::jsonb));
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists organization_roles_audit_mutation on public.organization_roles;
create trigger organization_roles_audit_mutation
after insert or update or delete on public.organization_roles
for each row execute function public.audit_organization_mutation();

drop trigger if exists organization_role_permissions_audit_mutation on public.organization_role_permissions;
create trigger organization_role_permissions_audit_mutation
after insert or update or delete on public.organization_role_permissions
for each row execute function public.audit_organization_mutation();

select 'role and membership audit coverage installed' as result;
