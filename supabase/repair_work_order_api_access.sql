-- Repair the Work Order Data API grants after the Work Order migrations exist.
-- Run this in Supabase Dashboard > SQL Editor as an owner/admin.
-- This does not disable RLS or grant browser access to anon/public.

grant usage on schema public to authenticated;

do $$
declare
  table_name text;
  table_grant text;
begin
  foreach table_name in array array[
    'work_order_activity',
    'work_order_comments',
    'work_order_comment_attachments',
    'work_order_reads',
    'work_order_time_entries',
    'work_order_cost_entries',
    'work_order_tracking_types',
    'work_order_saved_filters'
  ] loop
    if to_regclass(format('public.%s', table_name)) is not null then
      execute format('revoke all on table public.%I from public, anon', table_name);
      table_grant := case table_name
        when 'work_order_tracking_types' then 'select, insert, update, delete'
        when 'work_order_saved_filters' then 'select, insert, update, delete'
        else 'select'
      end;
      execute format('grant %s on table public.%I to authenticated', table_grant, table_name);
    end if;
  end loop;
end;
$$;

do $$
declare
  function_signature text;
begin
  foreach function_signature in array array[
    'public.get_work_order_inbox_counts(uuid, text, text, jsonb)',
    'public.get_work_order_inbox_page(uuid, text, text, text, text, integer, integer, boolean, jsonb)',
    'public.get_unread_work_order_count(uuid)',
    'public.mark_work_order_read(uuid)',
    'public.mark_work_order_unread(uuid)',
    'public.mark_work_order_inbox_read(uuid, text, text, jsonb)',
    'public.validate_work_order_inbox_filters(jsonb)',
    'public.work_order_matches_inbox_filters(public.work_orders, jsonb)',
    'public.work_order_matches_inbox_filters_base(public.work_orders, jsonb)',
    'public.start_work_order_timer(uuid, uuid)',
    'public.resume_work_order_timer(uuid)',
    'public.pause_work_order_timer(uuid, boolean)',
    'public.create_work_order_time_entry(uuid, uuid, uuid, integer, numeric, text)',
    'public.create_work_order_cost_entry(uuid, uuid, uuid, numeric, text)',
    'public.update_work_order_time_entry(uuid, uuid, integer, numeric, text)',
    'public.delete_work_order_time_entry(uuid)',
    'public.update_work_order_cost_entry(uuid, uuid, numeric, text)',
    'public.delete_work_order_cost_entry(uuid)'
  ] loop
    if to_regprocedure(function_signature) is not null then
      execute format('revoke execute on function %s from public, anon', function_signature);
      execute format('grant execute on function %s to authenticated', function_signature);
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';

-- Verification: these rows should show authenticated in grantee and no anon rows.
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'work_order_activity',
    'work_order_comments',
    'work_order_comment_attachments',
    'work_order_reads',
    'work_order_time_entries',
    'work_order_cost_entries',
    'work_order_tracking_types',
    'work_order_saved_filters'
  )
  and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;
