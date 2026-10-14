-- Re-assert the external completion boundary for deployments where the
-- completion RPC predates the configured procedure interaction check.
create or replace function public.mark_external_work_order_finished(raw_token text, external_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  selected_share record;
  access_settings jsonb;
  normalized_name text := nullif(btrim(external_name), '');
begin
  if raw_token is null or char_length(raw_token) <> 64 or raw_token !~ '^[0-9a-f]+$' then
    raise exception 'This external Work Order link is invalid or expired' using errcode = '42501';
  end if;
  if normalized_name is null or char_length(normalized_name) > 120 then
    raise exception 'Enter your name before marking the Work Order finished';
  end if;

  select shares.work_order_id, shares.organization_id, organizations.work_order_settings
    into selected_share
  from public.work_order_external_shares shares
  join public.work_orders work_orders on work_orders.id = shares.work_order_id
    and work_orders.organization_id = shares.organization_id
  join public.organizations organizations on organizations.id = shares.organization_id
    and organizations.status = 'active'
  where shares.token_hash = encode(digest(lower(raw_token), 'sha256'), 'hex')
    and shares.enabled
    and coalesce(organizations.work_order_settings ->> 'externalWorkOrders', 'false') = 'true'
    and work_orders.status not in ('Completed', 'Cancelled', 'Skipped')
    and (shares.expires_at is null or shares.expires_at > now());
  if not found then
    raise exception 'This external Work Order link is invalid or expired' using errcode = '42501';
  end if;

  access_settings := public.external_work_order_access_settings(selected_share.work_order_settings);
  if coalesce(access_settings ->> 'procedure', 'hidden') <> 'interact' then
    raise exception 'Completion is not enabled for this external Work Order' using errcode = '42501';
  end if;

  update public.work_orders
  set external_finished_at = now(), external_finished_by_name = normalized_name
  where id = selected_share.work_order_id
    and organization_id = selected_share.organization_id;

  return jsonb_build_object('finished', true, 'finishedAt', now(), 'finishedByName', normalized_name);
end;
$$;

revoke execute on function public.mark_external_work_order_finished(text, text) from public;
grant execute on function public.mark_external_work_order_finished(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
