-- Structural assertions for the External Work Orders security boundary.
-- Run after applying migrations in a Supabase/Postgres test database.
do $$
declare
  function_signature text;
  required_functions text[] := array[
    'public.external_work_order_share_allowed(uuid)',
    'public.create_work_order_external_share(uuid)',
    'public.get_work_order_external_share(uuid)',
    'public.disable_work_order_external_share(uuid)',
    'public.reset_work_order_external_share(uuid)',
    'public.get_external_work_order(text)',
    'public.post_external_work_order_comment(text,text,text,text)',
    'public.mark_external_work_order_finished(text,text)',
    'public.external_work_order_access_settings(jsonb)',
    'public.list_work_order_external_share_contacts(uuid)',
    'public.set_work_order_external_share_contacts(uuid,jsonb)'
  ];
begin
  if to_regclass('public.work_order_external_shares') is null then
    raise exception 'Missing External Work Order share table';
  end if;
  if to_regclass('public.work_order_external_share_contacts') is null then
    raise exception 'Missing External Work Order contact table';
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.work_order_external_shares'::regclass) then
    raise exception 'RLS is not enabled for work_order_external_shares';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.work_order_external_share_contacts'::regclass) then
    raise exception 'RLS is not enabled for work_order_external_share_contacts';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.work_order_activity'::regclass
      and conname = 'work_order_activity_event_type_check'
      and position('external_completion_requested' in pg_get_constraintdef(oid)) > 0
      and position('work_order_time_added' in pg_get_constraintdef(oid)) > 0
      and position('work_order_cost_added' in pg_get_constraintdef(oid)) > 0
  ) then
    raise exception 'Internal activity must support external, time, and cost events';
  end if;

  if to_regclass('public.work_order_external_shares_work_order_idx') is null then
    raise exception 'Missing one-share-per-Work-Order uniqueness index';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.work_order_external_shares'::regclass
      and tgname = 'work_order_external_shares_set_updated_at'
      and tgfoid = to_regprocedure('public.set_external_work_order_share_updated_at()')
  ) then
    raise exception 'External share rows must use the share-specific timestamp trigger';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.organization_roles'::regclass
      and tgname = 'organization_roles_seed_external_work_order_permission'
  ) then
    raise exception 'New organization admin roles will not receive external sharing permission';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.work_orders'::regclass
      and tgname = 'work_orders_disable_external_share_on_close'
  ) then
    raise exception 'Closing a Work Order must revoke its external share';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.organizations'::regclass
      and tgname = 'organizations_disable_external_shares_when_feature_off'
  ) then
    raise exception 'Disabling the organization feature must revoke external shares';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.work_orders'::regclass
      and tgname = 'work_orders_capture_external_completion_activity'
  ) then
    raise exception 'External completion requests must be recorded in internal activity';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizations'
      and column_name in ('date_format', 'time_format')
    having count(*) = 2
  ) then
    raise exception 'Organizations must store date and time format preferences';
  end if;

  foreach function_signature in array required_functions loop
    if to_regprocedure(function_signature) is null then
      raise exception 'Missing External Work Order function: %', function_signature;
    end if;
  end loop;

  if not has_function_privilege('anon', 'public.get_external_work_order(text)', 'EXECUTE')
    or not has_function_privilege('anon', 'public.post_external_work_order_comment(text,text,text,text)', 'EXECUTE')
    or not has_function_privilege('anon', 'public.mark_external_work_order_finished(text,text)', 'EXECUTE') then
    raise exception 'Anonymous External Work Order RPC grants are incomplete';
  end if;

  if not has_function_privilege('authenticated', 'public.list_work_order_external_share_contacts(uuid)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.set_work_order_external_share_contacts(uuid,jsonb)', 'EXECUTE')
    or has_function_privilege('anon', 'public.list_work_order_external_share_contacts(uuid)', 'EXECUTE')
    or has_function_privilege('anon', 'public.set_work_order_external_share_contacts(uuid,jsonb)', 'EXECUTE') then
    raise exception 'External contact management RPC grants are incomplete';
  end if;

  if has_function_privilege('anon', 'public.create_work_order_external_share(uuid)', 'EXECUTE')
    or has_function_privilege('anon', 'public.get_work_order_external_share(uuid)', 'EXECUTE')
    or has_function_privilege('anon', 'public.disable_work_order_external_share(uuid)', 'EXECUTE')
    or has_function_privilege('anon', 'public.reset_work_order_external_share(uuid)', 'EXECUTE') then
    raise exception 'Anonymous callers can execute an authenticated share-management RPC';
  end if;

  if has_table_privilege('anon', 'public.work_order_external_shares', 'SELECT')
    or has_table_privilege('anon', 'public.work_order_external_shares', 'INSERT')
    or has_table_privilege('anon', 'public.work_order_external_shares', 'UPDATE')
    or has_table_privilege('anon', 'public.work_order_external_shares', 'DELETE')
    or has_table_privilege('authenticated', 'public.work_order_external_shares', 'SELECT')
    or has_table_privilege('authenticated', 'public.work_order_external_shares', 'INSERT')
    or has_table_privilege('authenticated', 'public.work_order_external_shares', 'UPDATE')
    or has_table_privilege('authenticated', 'public.work_order_external_shares', 'DELETE') then
    raise exception 'The External Work Order share table is directly accessible to browser roles';
  end if;

  if has_table_privilege('anon', 'public.work_order_external_share_contacts', 'SELECT')
    or has_table_privilege('anon', 'public.work_order_external_share_contacts', 'INSERT')
    or has_table_privilege('anon', 'public.work_order_external_share_contacts', 'UPDATE')
    or has_table_privilege('anon', 'public.work_order_external_share_contacts', 'DELETE')
    or has_table_privilege('authenticated', 'public.work_order_external_share_contacts', 'SELECT')
    or has_table_privilege('authenticated', 'public.work_order_external_share_contacts', 'INSERT')
    or has_table_privilege('authenticated', 'public.work_order_external_share_contacts', 'UPDATE')
    or has_table_privilege('authenticated', 'public.work_order_external_share_contacts', 'DELETE') then
    raise exception 'The External Work Order contact table is directly accessible to browser roles';
  end if;

  if not exists (
    select 1
    from pg_proc
    where oid = to_regprocedure('public.get_external_work_order(text)')
      and prosecdef
  ) then
    raise exception 'Public External Work Order read must use a narrow SECURITY DEFINER RPC';
  end if;

  if position('extensions' in lower(pg_get_functiondef(to_regprocedure('public.create_work_order_external_share(uuid)')))) = 0 then
    raise exception 'External share token generation must resolve pgcrypto through the extensions schema';
  end if;

  if position('extensions' in lower(pg_get_functiondef(to_regprocedure('public.get_external_work_order(text)')))) = 0
    or position('extensions' in lower(pg_get_functiondef(to_regprocedure('public.post_external_work_order_comment(text,text,text,text)')))) = 0
    or position('extensions' in lower(pg_get_functiondef(to_regprocedure('public.mark_external_work_order_finished(text,text)')))) = 0 then
    raise exception 'External bearer-token RPCs must resolve pgcrypto through the extensions schema';
  end if;

  if position('date_format' in lower(pg_get_functiondef(to_regprocedure('public.get_external_work_order(text)')))) = 0
    or position('time_format' in lower(pg_get_functiondef(to_regprocedure('public.get_external_work_order(text)')))) = 0
    or position('preferences' in lower(pg_get_functiondef(to_regprocedure('public.get_external_work_order(text)')))) = 0
    or position('work_order_number' in lower(pg_get_functiondef(to_regprocedure('public.get_external_work_order(text)')))) = 0
    or position('workordernumber' in lower(pg_get_functiondef(to_regprocedure('public.get_external_work_order(text)')))) = 0
    or position('public.profiles' in lower(pg_get_functiondef(to_regprocedure('public.get_external_work_order(text)')))) = 0
    or position('first_name' in lower(pg_get_functiondef(to_regprocedure('public.get_external_work_order(text)')))) = 0
    or position('last_name' in lower(pg_get_functiondef(to_regprocedure('public.get_external_work_order(text)')))) = 0 then
    raise exception 'External Work Order payload must include the Work Order number, organization localization preferences, and internal author resolution';
  end if;

  if position('case' in lower(pg_get_functiondef(to_regprocedure('public.external_work_order_access_settings(jsonb)')))) = 0
    or position('externalworkorderaccess' in lower(pg_get_functiondef(to_regprocedure('public.external_work_order_access_settings(jsonb)')))) = 0
    or position('interact' in lower(pg_get_functiondef(to_regprocedure('public.external_work_order_access_settings(jsonb)')))) = 0
    or position('showinternalcommentauthors' in lower(pg_get_functiondef(to_regprocedure('public.external_work_order_access_settings(jsonb)')))) = 0
    or position('requirecommentername' in lower(pg_get_functiondef(to_regprocedure('public.external_work_order_access_settings(jsonb)')))) = 0
    or position('requirecommenteremail' in lower(pg_get_functiondef(to_regprocedure('public.external_work_order_access_settings(jsonb)')))) = 0 then
    raise exception 'External field visibility and comment identity settings must fail closed for unknown values';
  end if;

  if position('requirecommentername' in lower(pg_get_functiondef(to_regprocedure('public.post_external_work_order_comment(text,text,text,text)')))) = 0
    or position('requirecommenteremail' in lower(pg_get_functiondef(to_regprocedure('public.post_external_work_order_comment(text,text,text,text)')))) = 0 then
    raise exception 'External comment creation must honor the configured commenter email requirement';
  end if;

  if position('procedure' in lower(pg_get_functiondef(to_regprocedure('public.mark_external_work_order_finished(text,text)')))) = 0
    or position('interact' in lower(pg_get_functiondef(to_regprocedure('public.mark_external_work_order_finished(text,text)')))) = 0 then
    raise exception 'External completion must honor the configured procedure interaction permission';
  end if;

  if position('external_finished_at' in lower(pg_get_functiondef(to_regprocedure('public.mark_external_work_order_finished(text,text)')))) = 0
    or position('external_finished_by_name' in lower(pg_get_functiondef(to_regprocedure('public.mark_external_work_order_finished(text,text)')))) = 0
    or position('set status =' in lower(pg_get_functiondef(to_regprocedure('public.mark_external_work_order_finished(text,text)')))) > 0 then
    raise exception 'External completion must record a request without changing internal Work Order status';
  end if;

  foreach function_signature in array array[
    '1_day', '2_days', '3_days', '4_days', '5_days', '7_days', '30_days', '90_days', 'work_order_closed'
  ] loop
    if position(function_signature in lower(pg_get_functiondef(to_regprocedure('public.external_work_order_expiration(jsonb)')))) = 0 then
      raise exception 'External link expiration option is missing: %', function_signature;
    end if;
  end loop;
end;
$$;

select 'external Work Order structural assertions passed' as result;
