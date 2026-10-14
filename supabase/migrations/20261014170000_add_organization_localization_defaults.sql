-- Organization-level localization defaults are used by shared external views.
alter table public.organizations
  add column if not exists date_format text not null default 'MM/DD/YYYY',
  add column if not exists time_format text not null default '11:59 PM';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organizations_date_format_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_date_format_check
      check (date_format in ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'organizations_time_format_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_time_format_check
      check (time_format in ('11:59 PM', '23:59'));
  end if;
end;
$$;

notify pgrst, 'reload schema';

select 'Organization localization defaults installed' as result;
