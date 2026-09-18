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
  target_metadata jsonb;
begin
  if tg_op = 'DELETE' then
    if tg_table_name = 'organizations' then
      target_organization_id := old.id;
      target_entity_id := old.id;
      target_action := 'deleted';
      target_metadata := jsonb_build_object('name', old.name, 'status', old.status);
    elsif tg_table_name = 'organization_members' then
      target_organization_id := old.organization_id;
      target_entity_id := old.user_id;
      target_action := 'deleted';
      target_metadata := jsonb_build_object('role', old.role, 'status', old.status);
    else
      target_organization_id := old.organization_id;
      target_entity_id := old.id;
      target_action := 'deleted';
      target_metadata := jsonb_build_object('contact_type', old.contact_type, 'role', old.role, 'status', old.status);
    end if;
  elsif tg_op = 'INSERT' then
    if tg_table_name = 'organization_members' then
      target_organization_id := new.organization_id;
      target_entity_id := new.user_id;
      target_action := 'created';
      target_metadata := jsonb_build_object('role', new.role, 'status', new.status);
    else
      target_organization_id := new.organization_id;
      target_entity_id := new.id;
      target_action := 'created';
      target_metadata := jsonb_build_object('contact_type', new.contact_type, 'role', new.role, 'status', new.status);
    end if;
  else
    if tg_table_name = 'organizations' then
      target_organization_id := new.id;
      target_entity_id := new.id;
      target_action := 'updated';
      target_metadata := jsonb_build_object('name', new.name, 'status', new.status);
    elsif tg_table_name = 'organization_members' then
      target_organization_id := new.organization_id;
      target_entity_id := new.user_id;
      target_action := 'updated';
      target_metadata := jsonb_build_object('role', new.role, 'status', new.status);
    else
      if new.status = 'accepted' then
        return new;
      end if;
      target_organization_id := new.organization_id;
      target_entity_id := new.id;
      target_action := new.status;
      target_metadata := jsonb_build_object('contact_type', new.contact_type, 'role', new.role, 'status', new.status);
    end if;
  end if;

  if auth.uid() is not null then
    insert into public.audit_events (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (
      target_organization_id,
      auth.uid(),
      target_action,
      case tg_table_name
        when 'organizations' then 'organization'
        when 'organization_members' then 'organization_member'
        else 'organization_invitation'
      end,
      target_entity_id,
      target_metadata
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_audit_mutation on public.organizations;
create trigger organizations_audit_mutation
after update on public.organizations
for each row execute function public.audit_organization_mutation();

drop trigger if exists organization_members_audit_mutation on public.organization_members;
create trigger organization_members_audit_mutation
after insert or update or delete on public.organization_members
for each row execute function public.audit_organization_mutation();

drop trigger if exists organization_invitations_audit_mutation on public.organization_invitations;
create trigger organization_invitations_audit_mutation
after insert or update or delete on public.organization_invitations
for each row execute function public.audit_organization_mutation();
