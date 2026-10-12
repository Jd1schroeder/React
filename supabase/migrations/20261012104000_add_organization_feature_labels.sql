alter table public.organizations
  add column if not exists feature_labels jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_feature_labels_object_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_feature_labels_object_check
      check (jsonb_typeof(feature_labels) = 'object');
  end if;
end;
$$;
