-- The localization payload migration may already be applied. Extend the
-- restricted payload forward so existing deployments receive the Work Order
-- number without editing or rerunning an earlier migration.
create or replace function public.get_external_work_order(raw_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  selected_share record;
  access_settings jsonb;
  work_order_payload jsonb;
  comments_payload jsonb := '[]'::jsonb;
  attachments_payload jsonb := '[]'::jsonb;
begin
  if raw_token is null or char_length(raw_token) <> 64 or raw_token !~ '^[0-9a-f]+$' then
    return jsonb_build_object('available', false);
  end if;

  select shares.id as share_id,
         shares.expires_at,
         shares.work_order_id,
         work_orders.organization_id,
         work_orders.work_order_number,
         work_orders.title,
         work_orders.description,
         work_orders.status,
         work_orders.priority,
         work_orders.procedure_progress,
         work_orders.due_date,
         work_orders.due_time,
         work_orders.external_finished_at,
         work_orders.external_finished_by_name,
         organizations.work_order_settings,
         organizations.date_format,
         organizations.time_format,
         organizations.timezone
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
    return jsonb_build_object('available', false);
  end if;

  access_settings := public.external_work_order_access_settings(selected_share.work_order_settings);

  update public.work_order_external_shares
  set last_accessed_at = now()
  where id = selected_share.share_id;

  if coalesce(access_settings ->> 'comments', 'hidden') <> 'hidden' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', comments.id,
      'body', comments.body,
      'createdAt', comments.created_at,
      'editedAt', comments.edited_at,
      'authorName', coalesce(nullif(comments.external_author_name, ''), 'Workbench team member')
    ) order by comments.created_at asc), '[]'::jsonb)
      into comments_payload
    from public.work_order_comments comments
    where comments.organization_id = selected_share.organization_id
      and comments.work_order_id = selected_share.work_order_id
      and comments.deleted_at is null;
  end if;

  if coalesce(access_settings ->> 'attachments', 'hidden') <> 'hidden' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', attachments.id,
      'fileName', attachments.file_name,
      'contentType', attachments.content_type,
      'kind', attachments.kind
    ) order by attachments.created_at asc), '[]'::jsonb)
      into attachments_payload
    from public.work_order_attachments attachments
    where attachments.organization_id = selected_share.organization_id
      and attachments.work_order_id = selected_share.work_order_id;
  end if;

  work_order_payload := jsonb_strip_nulls(jsonb_build_object(
    'id', selected_share.work_order_id,
    'workOrderNumber', selected_share.work_order_number,
    'title', selected_share.title,
    'status', selected_share.status,
    'description', case when access_settings ->> 'description' = 'hidden' then null else selected_share.description end,
    'dueDate', case when access_settings ->> 'due_date' = 'hidden' then null else selected_share.due_date end,
    'dueTime', case when access_settings ->> 'due_date' = 'hidden' then null else selected_share.due_time end,
    'priority', case when access_settings ->> 'priority' = 'hidden' then null else selected_share.priority end,
    'procedureProgress', case when access_settings ->> 'procedure' = 'hidden' then null else selected_share.procedure_progress end,
    'externalFinishedAt', selected_share.external_finished_at,
    'externalFinishedByName', selected_share.external_finished_by_name,
    'attachments', attachments_payload,
    'comments', comments_payload
  ));

  return jsonb_build_object(
    'available', true,
    'workOrder', work_order_payload,
    'permissions', access_settings,
    'preferences', jsonb_build_object(
      'dateFormat', coalesce(selected_share.date_format, 'MM/DD/YYYY'),
      'timeFormat', coalesce(selected_share.time_format, '11:59 PM'),
      'timezone', coalesce(selected_share.timezone, 'America/Detroit')
    ),
    'expiresAt', selected_share.expires_at
  );
end;
$$;

revoke all on function public.get_external_work_order(text) from public, anon, authenticated;
grant execute on function public.get_external_work_order(text) to anon, authenticated;

notify pgrst, 'reload schema';
