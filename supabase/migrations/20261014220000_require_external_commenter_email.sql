-- Keep the external comment contact requirement organization-configurable.
-- The default remains name-only; the email requirement is enforced by the RPC.
create or replace function public.external_work_order_access_settings(target_settings jsonb)
returns jsonb
language sql
stable
set search_path = public
as $$
with defaults as (
  select public.external_work_order_access_defaults() as settings
), requested as (
  select target_settings -> 'externalWorkOrderAccess' as settings,
         (target_settings -> 'externalWorkOrderAccess' is null
           or jsonb_typeof(target_settings -> 'externalWorkOrderAccess') = 'object') as is_object
)
select jsonb_build_object(
  'description', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'description', defaults.settings ->> 'description') in ('hidden', 'view') then coalesce(requested.settings ->> 'description', defaults.settings ->> 'description') else 'hidden' end,
  'due_date', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'due_date', defaults.settings ->> 'due_date') in ('hidden', 'view') then coalesce(requested.settings ->> 'due_date', defaults.settings ->> 'due_date') else 'hidden' end,
  'priority', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'priority', defaults.settings ->> 'priority') in ('hidden', 'view') then coalesce(requested.settings ->> 'priority', defaults.settings ->> 'priority') else 'hidden' end,
  'asset', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'asset', defaults.settings ->> 'asset') in ('hidden', 'view') then coalesce(requested.settings ->> 'asset', defaults.settings ->> 'asset') else 'hidden' end,
  'location', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'location', defaults.settings ->> 'location') in ('hidden', 'view') then coalesce(requested.settings ->> 'location', defaults.settings ->> 'location') else 'hidden' end,
  'custom_fields', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'custom_fields', defaults.settings ->> 'custom_fields') in ('hidden', 'view') then coalesce(requested.settings ->> 'custom_fields', defaults.settings ->> 'custom_fields') else 'hidden' end,
  'procedure', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'procedure', defaults.settings ->> 'procedure') in ('hidden', 'view', 'interact') then coalesce(requested.settings ->> 'procedure', defaults.settings ->> 'procedure') else 'hidden' end,
  'comments', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'comments', defaults.settings ->> 'comments') in ('hidden', 'view', 'comment', 'interact') then coalesce(requested.settings ->> 'comments', defaults.settings ->> 'comments') else 'hidden' end,
  'attachments', case when not requested.is_object then 'hidden' when coalesce(requested.settings ->> 'attachments', defaults.settings ->> 'attachments') in ('hidden', 'view') then coalesce(requested.settings ->> 'attachments', defaults.settings ->> 'attachments') else 'hidden' end,
  'showInternalCommentAuthors', case
    when not requested.is_object then false
    when jsonb_typeof(requested.settings -> 'showInternalCommentAuthors') = 'boolean'
      then (requested.settings ->> 'showInternalCommentAuthors')::boolean
    else false
  end,
  'requireCommenterName', case
    when not requested.is_object then true
    when jsonb_typeof(requested.settings -> 'requireCommenterName') = 'boolean'
      then (requested.settings ->> 'requireCommenterName')::boolean
    else true
  end,
  'requireCommenterEmail', case
    when not requested.is_object then false
    when jsonb_typeof(requested.settings -> 'requireCommenterEmail') = 'boolean'
      then (requested.settings ->> 'requireCommenterEmail')::boolean
    else false
  end
)
from defaults, requested;
$$;

revoke execute on function public.external_work_order_access_settings(jsonb) from public;

create or replace function public.post_external_work_order_comment(
  raw_token text,
  external_name text,
  external_email text,
  comment_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  selected_share record;
  access_settings jsonb;
  normalized_name text := nullif(btrim(external_name), '');
  normalized_email text := nullif(btrim(external_email), '');
  normalized_body text := nullif(btrim(comment_body), '');
  created_comment public.work_order_comments;
begin
  if raw_token is null or char_length(raw_token) <> 64 then
    raise exception 'This external Work Order link is invalid or expired' using errcode = '42501';
  end if;
  if char_length(normalized_name) > 120 then
    raise exception 'Your name cannot be longer than 120 characters';
  end if;
  if normalized_body is null or char_length(normalized_body) > 10000 then
    raise exception 'Comments must contain between 1 and 10,000 characters';
  end if;
  if normalized_email is not null and normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address';
  end if;

  select shares.id as share_id, shares.organization_id, shares.work_order_id, organizations.work_order_settings
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
  if coalesce(access_settings ->> 'comments', 'hidden') not in ('comment', 'interact') then
    raise exception 'Comments are not enabled for this external Work Order' using errcode = '42501';
  end if;
  if coalesce((access_settings ->> 'requireCommenterName')::boolean, true) and normalized_name is null then
    raise exception 'Enter your name before posting a comment';
  end if;
  if coalesce((access_settings ->> 'requireCommenterEmail')::boolean, false) and normalized_email is null then
    raise exception 'Enter your email before posting a comment';
  end if;

  insert into public.work_order_comments (
    id, organization_id, work_order_id, author_id, body, external_author_name, external_author_email
  ) values (
    gen_random_uuid(), selected_share.organization_id, selected_share.work_order_id,
    null, normalized_body, normalized_name, normalized_email
  ) returning * into created_comment;

  return jsonb_build_object(
    'id', created_comment.id,
    'body', created_comment.body,
    'createdAt', created_comment.created_at,
    'authorName', coalesce(created_comment.external_author_name, 'External contact')
  );
end;
$$;

revoke execute on function public.post_external_work_order_comment(text, text, text, text) from public;
grant execute on function public.post_external_work_order_comment(text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
