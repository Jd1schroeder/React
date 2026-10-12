alter table public.organizations
  add column if not exists address_line_1 text,
  add column if not exists address_line_2 text,
  add column if not exists city text,
  add column if not exists state_or_region text,
  add column if not exists postal_code text,
  add column if not exists country text;

-- Existing Workbench organizations used description for the displayed address.
-- Preserve that data as the first address line during the forward migration.
update public.organizations
set address_line_1 = nullif(btrim(description), '')
where address_line_1 is null
  and description is not null;
