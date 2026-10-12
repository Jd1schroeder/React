alter table public.organizations
  add column if not exists work_order_settings jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organizations_work_order_settings_object_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_work_order_settings_object_check
      check (jsonb_typeof(work_order_settings) = 'object');
  end if;
end;
$$;
