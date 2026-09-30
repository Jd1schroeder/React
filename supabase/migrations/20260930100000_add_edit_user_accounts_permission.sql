-- Allow organization administrators to update member account details through the managed account boundary.

insert into public.organization_role_permissions (role_id, permission_key, scope)
select id, 'organization.edit_user_accounts', 'any'
from public.organization_roles
where is_system = true
  and system_key = 'organization_admin'
on conflict (role_id, permission_key) do nothing;

select 'edit user accounts permission installed' as result;
