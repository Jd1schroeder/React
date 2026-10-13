-- Make the default Work Order cost types organization-owned.
-- Organizations may rename or remove these defaults just like custom types.

update public.work_order_tracking_types
set is_system = false,
    updated_at = now()
where is_system = true
  and kind = 'cost';

create or replace function public.seed_work_order_tracking_types()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.work_order_tracking_types (organization_id, kind, name, is_system)
  values
    (new.id, 'time', 'Work', true),
    (new.id, 'time', 'Inspection', true),
    (new.id, 'time', 'Other', true),
    (new.id, 'cost', 'Labor', false),
    (new.id, 'cost', 'Travel', false),
    (new.id, 'cost', 'Other', false)
  on conflict (organization_id, kind, name) do nothing;
  return new;
end;
$$;

insert into public.work_order_tracking_types (organization_id, kind, name, is_system)
select organizations.id, defaults.kind, defaults.name, false
from public.organizations organizations
cross join (values
  ('time', 'Work'), ('time', 'Inspection'), ('time', 'Other'),
  ('cost', 'Labor'), ('cost', 'Travel'), ('cost', 'Other')
) as defaults(kind, name)
where defaults.kind = 'cost'
on conflict (organization_id, kind, name) do nothing;
