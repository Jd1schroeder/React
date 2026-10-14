-- Normalize organization-provided external access values before any external
-- RPC uses them. Unknown values fail closed instead of exposing a field.
create or replace function public.external_work_order_access_settings(target_settings jsonb)
returns jsonb
language sql
stable
set search_path = public
as $$
with defaults as (
  select public.external_work_order_access_defaults() as settings
), requested as (
  select target_settings -> 'externalWorkOrderAccess' as settings,
         (target_settings -> 'externalWorkOrderAccess' is null
           or jsonb_typeof(target_settings -> 'externalWorkOrderAccess') = 'object') as is_object
)
select jsonb_build_object(
  'description', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'description', defaults.settings ->> 'description') in ('hidden', 'view') then coalesce(requested.settings ->> 'description', defaults.settings ->> 'description') else 'hidden' end,
  'due_date', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'due_date', defaults.settings ->> 'due_date') in ('hidden', 'view') then coalesce(requested.settings ->> 'due_date', defaults.settings ->> 'due_date') else 'hidden' end,
  'priority', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'priority', defaults.settings ->> 'priority') in ('hidden', 'view') then coalesce(requested.settings ->> 'priority', defaults.settings ->> 'priority') else 'hidden' end,
  'asset', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'asset', defaults.settings ->> 'asset') in ('hidden', 'view') then coalesce(requested.settings ->> 'asset', defaults.settings ->> 'asset') else 'hidden' end,
  'location', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'location', defaults.settings ->> 'location') in ('hidden', 'view') then coalesce(requested.settings ->> 'location', defaults.settings ->> 'location') else 'hidden' end,
  'custom_fields', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'custom_fields', defaults.settings ->> 'custom_fields') in ('hidden', 'view') then coalesce(requested.settings ->> 'custom_fields', defaults.settings ->> 'custom_fields') else 'hidden' end,
  'procedure', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'procedure', defaults.settings ->> 'procedure') in ('hidden', 'view', 'interact') then coalesce(requested.settings ->> 'procedure', defaults.settings ->> 'procedure') else 'hidden' end,
  'comments', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'comments', defaults.settings ->> 'comments') in ('hidden', 'view', 'comment', 'interact') then coalesce(requested.settings ->> 'comments', defaults.settings ->> 'comments') else 'hidden' end,
  'attachments', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'attachments', defaults.settings ->> 'attachments') in ('hidden', 'view') then coalesce(requested.settings ->> 'attachments', defaults.settings ->> 'attachments') else 'hidden' end
)
from defaults, requested;
$$;

revoke execute on function public.external_work_order_access_settings(jsonb) from public;

notify pgrst, 'reload schema';
