-- Persist the contacts selected for an external Work Order link.
-- Contact records are managed through narrow authenticated RPCs; browser roles
-- never receive direct table access.

create table if not exists public.work_order_external_share_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  share_id uuid not null references public.work_order_external_shares(id) on delete cascade,
  vendor_name text,
  display_name text,
  email text not null check (char_length(btrim(email)) between 3 and 320),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint work_order_external_share_contacts_organization_fk
    foreign key (organization_id) references public.organizations(id) on delete cascade
);

create unique index if not exists work_order_external_share_contacts_email_idx
  on public.work_order_external_share_contacts(share_id, lower(email));
create index if not exists work_order_external_share_contacts_organization_idx
  on public.work_order_external_share_contacts(organization_id, share_id, created_at);

alter table public.work_order_external_share_contacts enable row level security;
revoke all on table public.work_order_external_share_contacts from anon, authenticated;

create or replace function public.list_work_order_external_share_contacts(target_work_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_share_id uuid;
  selected_organization_id uuid;
  contacts_payload jsonb;
begin
  if auth.uid() is null or not public.external_work_order_share_allowed(target_work_order_id) then
    raise exception 'You do not have permission to manage external contacts' using errcode = '42501';
  end if;

  select shares.id, shares.organization_id
    into selected_share_id, selected_organization_id
  from public.work_order_external_shares shares
  where shares.work_order_id = target_work_order_id;
  if not found then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', contacts.id,
    'vendorName', contacts.vendor_name,
    'displayName', contacts.display_name,
    'email', contacts.email
  ) order by contacts.created_at asc, contacts.id asc), '[]'::jsonb)
    into contacts_payload
  from public.work_order_external_share_contacts contacts
  where contacts.organization_id = selected_organization_id
    and contacts.share_id = selected_share_id;

  return contacts_payload;
end;
$$;

revoke all on function public.list_work_order_external_share_contacts(uuid) from public, anon, authenticated;
grant execute on function public.list_work_order_external_share_contacts(uuid) to authenticated;

create or replace function public.set_work_order_external_share_contacts(
  target_work_order_id uuid,
  target_contacts jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_share_id uuid;
  selected_organization_id uuid;
  contact jsonb;
  normalized_vendor_name text;
  normalized_display_name text;
  normalized_email text;
begin
  if auth.uid() is null or not public.external_work_order_share_allowed(target_work_order_id) then
    raise exception 'You do not have permission to manage external contacts' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(target_contacts, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(target_contacts, '[]'::jsonb)) > 50 then
    raise exception 'External contact selections must be an array with no more than 50 contacts';
  end if;

  select shares.id, shares.organization_id
    into selected_share_id, selected_organization_id
  from public.work_order_external_shares shares
  where shares.work_order_id = target_work_order_id;
  if not found then
    raise exception 'Enable the external link before selecting contacts';
  end if;

  delete from public.work_order_external_share_contacts
  where share_id = selected_share_id
    and organization_id = selected_organization_id;

  for contact in select value from jsonb_array_elements(coalesce(target_contacts, '[]'::jsonb)) loop
    if jsonb_typeof(contact) <> 'object' then
      raise exception 'Each external contact must be an object';
    end if;

    normalized_vendor_name := nullif(btrim(contact ->> 'vendorName'), '');
    normalized_display_name := nullif(btrim(contact ->> 'displayName'), '');
    normalized_email := lower(nullif(btrim(contact ->> 'email'), ''));

    if normalized_vendor_name is not null and char_length(normalized_vendor_name) > 120 then
      raise exception 'Vendor names must be 120 characters or fewer';
    end if;
    if normalized_display_name is not null and char_length(normalized_display_name) > 120 then
      raise exception 'Contact names must be 120 characters or fewer';
    end if;
    if normalized_email is null
      or char_length(normalized_email) > 320
      or normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      raise exception 'Enter a valid email address for every external contact';
    end if;

    insert into public.work_order_external_share_contacts (
      organization_id, share_id, vendor_name, display_name, email, created_by
    ) values (
      selected_organization_id, selected_share_id, normalized_vendor_name,
      normalized_display_name, normalized_email, auth.uid()
    );
  end loop;

  return public.list_work_order_external_share_contacts(target_work_order_id);
end;
$$;

revoke all on function public.set_work_order_external_share_contacts(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.set_work_order_external_share_contacts(uuid, jsonb) to authenticated;

select 'External Work Order contact selection installed' as result;
