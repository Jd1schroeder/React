-- External Work Orders are exposed only through the narrow RPCs below.
-- The share table itself is never available through the browser Data API.

alter table public.work_orders
  add column if not exists external_finished_at timestamptz,
  add column if not exists external_finished_by_name text;

alter table public.work_order_comments
  add column if not exists external_author_name text,
  add column if not exists external_author_email text;

create table if not exists public.work_order_external_shares (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_order_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  enabled boolean not null default true,
  expires_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_accessed_at timestamptz,
  constraint work_order_external_shares_work_order_fk
    foreign key (organization_id, work_order_id)
    references public.work_orders(organization_id, id) on delete cascade
);

create unique index if not exists work_order_external_shares_work_order_idx
  on public.work_order_external_shares(organization_id, work_order_id);
create index if not exists work_order_external_shares_token_idx
  on public.work_order_external_shares(token_hash);

alter table public.work_order_external_shares enable row level security;
revoke all on table public.work_order_external_shares from anon, authenticated;

create or replace function public.set_external_work_order_share_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_external_work_order_share_updated_at() from public;

drop trigger if exists work_order_external_shares_set_updated_at on public.work_order_external_shares;
create trigger work_order_external_shares_set_updated_at
before update on public.work_order_external_shares
for each row execute function public.set_external_work_order_share_updated_at();

create or replace function public.external_work_order_access_defaults()
returns jsonb
language sql
immutable
set search_path = public
as $$
  select '{"description":"view","due_date":"view","priority":"view","asset":"view","location":"view","custom_fields":"view","procedure":"interact","comments":"comment","attachments":"view"}'::jsonb;
$$;

create or replace function public.external_work_order_access_settings(target_settings jsonb)
returns jsonb
language sql
stable
set search_path = public
as $$
  select public.external_work_order_access_defaults() || coalesce(target_settings -> 'externalWorkOrderAccess', '{}'::jsonb);
$$;

create or replace function public.external_work_order_expiration(target_settings jsonb)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
declare
  expiration_key text := coalesce(target_settings ->> 'externalWorkOrderLinkExpiration', 'work_order_closed');
begin
  return case expiration_key
    when '1_day' then now() + interval '1 day'
    when '2_days' then now() + interval '2 days'
    when '3_days' then now() + interval '3 days'
    when '4_days' then now() + interval '4 days'
    when '5_days' then now() + interval '5 days'
    when '7_days' then now() + interval '7 days'
    when '30_days' then now() + interval '30 days'
    when '90_days' then now() + interval '90 days'
    else null
  end;
end;
$$;

revoke execute on function public.external_work_order_access_defaults() from public;
revoke execute on function public.external_work_order_access_settings(jsonb) from public;
revoke execute on function public.external_work_order_expiration(jsonb) from public;

create or replace function public.external_work_order_share_allowed(target_work_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.work_orders work_orders
    join public.organizations organizations on organizations.id = work_orders.organization_id
      and organizations.status = 'active'
      and coalesce(organizations.work_order_settings ->> 'externalWorkOrders', 'false') = 'true'
    where work_orders.id = target_work_order_id
      and work_orders.status not in ('Completed', 'Cancelled', 'Skipped')
      and public.has_work_order_permission(target_work_order_id, 'work_orders.share_externally')
  );
$$;

revoke execute on function public.external_work_order_share_allowed(uuid) from public;
grant execute on function public.external_work_order_share_allowed(uuid) to authenticated;

create or replace function public.create_work_order_external_share(target_work_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  selected_work_order record;
  organization_settings jsonb;
  raw_token text := encode(gen_random_bytes(32), 'hex');
  selected_expiration timestamptz;
  selected_share public.work_order_external_shares;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to share a Work Order' using errcode = '42501';
  end if;

  select work_orders.*, organizations.work_order_settings
    into selected_work_order
  from public.work_orders work_orders
  join public.organizations organizations on organizations.id = work_orders.organization_id
  where work_orders.id = target_work_order_id
    and organizations.status = 'active';
  if not found then
    raise exception 'Work Order not found';
  end if;
  organization_settings := selected_work_order.work_order_settings;
  if not public.external_work_order_share_allowed(target_work_order_id) then
    raise exception 'External sharing is not available for this Work Order' using errcode = '42501';
  end if;

  selected_expiration := public.external_work_order_expiration(organization_settings);
  insert into public.work_order_external_shares (
    organization_id, work_order_id, token_hash, enabled, expires_at, created_by
  ) values (
    selected_work_order.organization_id,
    selected_work_order.id,
    encode(digest(raw_token, 'sha256'), 'hex'),
    true,
    selected_expiration,
    auth.uid()
  )
  on conflict (organization_id, work_order_id) do update
    set token_hash = excluded.token_hash,
        enabled = true,
        expires_at = excluded.expires_at,
        created_by = excluded.created_by,
        updated_at = now()
  returning * into selected_share;

  return jsonb_build_object(
    'shareId', selected_share.id,
    'enabled', selected_share.enabled,
    'expiresAt', selected_share.expires_at,
    'token', raw_token
  );
end;
$$;

revoke execute on function public.create_work_order_external_share(uuid) from public;
grant execute on function public.create_work_order_external_share(uuid) to authenticated;

create or replace function public.get_work_order_external_share(target_work_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_share public.work_order_external_shares;
begin
  if auth.uid() is null or not public.external_work_order_share_allowed(target_work_order_id) then
    raise exception 'You do not have permission to manage external sharing' using errcode = '42501';
  end if;

  select * into selected_share
  from public.work_order_external_shares
  where work_order_id = target_work_order_id;

  if not found then
    return jsonb_build_object('enabled', false, 'expiresAt', null, 'shareId', null);
  end if;

  return jsonb_build_object(
    'shareId', selected_share.id,
    'enabled', selected_share.enabled
      and (selected_share.expires_at is null or selected_share.expires_at > now()),
    'expiresAt', selected_share.expires_at,
    'createdAt', selected_share.created_at,
    'lastAccessedAt', selected_share.last_accessed_at
  );
end;
$$;

revoke execute on function public.get_work_order_external_share(uuid) from public;
grant execute on function public.get_work_order_external_share(uuid) to authenticated;

create or replace function public.disable_work_order_external_share(target_work_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_share public.work_order_external_shares;
begin
  if auth.uid() is null or not public.external_work_order_share_allowed(target_work_order_id) then
    raise exception 'You do not have permission to manage external sharing' using errcode = '42501';
  end if;

  update public.work_order_external_shares
  set enabled = false
  where work_order_id = target_work_order_id
  returning * into updated_share;

  return jsonb_build_object('enabled', false, 'shareId', updated_share.id);
end;
$$;

revoke execute on function public.disable_work_order_external_share(uuid) from public;
grant execute on function public.disable_work_order_external_share(uuid) to authenticated;

create or replace function public.reset_work_order_external_share(target_work_order_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.create_work_order_external_share(target_work_order_id);
$$;

revoke execute on function public.reset_work_order_external_share(uuid) from public;
grant execute on function public.reset_work_order_external_share(uuid) to authenticated;

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
         work_orders.title,
         work_orders.description,
         work_orders.status,
         work_orders.priority,
         work_orders.procedure_progress,
         work_orders.due_date,
         work_orders.due_time,
         work_orders.external_finished_at,
         work_orders.external_finished_by_name,
         organizations.work_order_settings
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
    'expiresAt', selected_share.expires_at
  );
end;
$$;

revoke execute on function public.get_external_work_order(text) from public;
grant execute on function public.get_external_work_order(text) to anon, authenticated;

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
  normalized_name text := nullif(btrim(external_name), '');
  normalized_email text := nullif(btrim(external_email), '');
  normalized_body text := nullif(btrim(comment_body), '');
  created_comment public.work_order_comments;
begin
  if raw_token is null or char_length(raw_token) <> 64 then
    raise exception 'This external Work Order link is invalid or expired' using errcode = '42501';
  end if;
  if normalized_name is null or char_length(normalized_name) > 120 then
    raise exception 'Enter your name before posting a comment';
  end if;
  if normalized_body is null or char_length(normalized_body) > 10000 then
    raise exception 'Comments must contain between 1 and 10,000 characters';
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
  if coalesce(public.external_work_order_access_settings(selected_share.work_order_settings) ->> 'comments', 'hidden') not in ('comment', 'interact') then
    raise exception 'Comments are not enabled for this external Work Order' using errcode = '42501';
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
    'authorName', created_comment.external_author_name
  );
end;
$$;

revoke execute on function public.post_external_work_order_comment(text, text, text, text) from public;
grant execute on function public.post_external_work_order_comment(text, text, text, text) to anon, authenticated;

create or replace function public.mark_external_work_order_finished(raw_token text, external_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  selected_share record;
  normalized_name text := nullif(btrim(external_name), '');
begin
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
  if coalesce(public.external_work_order_access_settings(selected_share.work_order_settings) ->> 'procedure', 'hidden') <> 'interact' then
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

create or replace function public.disable_external_work_order_share_on_close()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('Completed', 'Cancelled', 'Skipped') and old.status is distinct from new.status then
    update public.work_order_external_shares
    set enabled = false
    where work_order_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists work_orders_disable_external_share_on_close on public.work_orders;
create trigger work_orders_disable_external_share_on_close
after update of status on public.work_orders
for each row execute function public.disable_external_work_order_share_on_close();

create or replace function public.disable_external_work_order_shares_when_feature_off()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.work_order_settings ->> 'externalWorkOrders', 'false') <> 'true' then
    update public.work_order_external_shares
    set enabled = false
    where organization_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_disable_external_shares_when_feature_off on public.organizations;
create trigger organizations_disable_external_shares_when_feature_off
after update of work_order_settings on public.organizations
for each row execute function public.disable_external_work_order_shares_when_feature_off();

insert into public.organization_role_permissions (role_id, permission_key, scope)
select roles.id, 'work_orders.share_externally', 'any'
from public.organization_roles roles
where roles.is_system = true
  and roles.system_key = 'organization_admin'
on conflict (role_id, permission_key) do nothing;

create or replace function public.ensure_external_work_order_admin_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_system and new.system_key = 'organization_admin' then
    insert into public.organization_role_permissions (role_id, permission_key, scope)
    values (new.id, 'work_orders.share_externally', 'any')
    on conflict (role_id, permission_key) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.ensure_external_work_order_admin_permission() from public;

drop trigger if exists organization_roles_seed_external_work_order_permission on public.organization_roles;
create trigger organization_roles_seed_external_work_order_permission
after insert on public.organization_roles
for each row execute function public.ensure_external_work_order_admin_permission();

notify pgrst, 'reload schema';

select 'External Work Orders foundation installed' as result;
