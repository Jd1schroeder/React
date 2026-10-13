alter table public.organizations
  add column if not exists currency text not null default 'USD';

alter table public.organizations
  drop constraint if exists organizations_currency_check;

alter table public.organizations
  add constraint organizations_currency_check
  check (currency = upper(currency) and currency ~ '^[A-Z]{3}$');
