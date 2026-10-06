create table public.work_order_activity (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('work_order_created', 'work_order_updated', 'status_changed')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index work_order_activity_record_created_idx
  on public.work_order_activity (organization_id, work_order_id, created_at desc, id desc);

create table public.work_order_comments (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text check (body is null or char_length(body) <= 10000),
  created_at timestamptz not null default now(),
  unique (organization_id, work_order_id, id)
);

create index work_order_comments_record_created_idx
  on public.work_order_comments (organization_id, work_order_id, created_at desc, id desc);

create table public.work_order_comment_attachments (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  comment_id uuid not null references public.work_order_comments(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('image', 'file')),
  storage_path text not null unique,
  file_name text not null check (char_length(btrim(file_name)) between 1 and 255),
  content_type text not null default 'application/octet-stream' check (char_length(content_type) <= 255),
  byte_size bigint not null check (byte_size between 1 and 10485760),
  created_at timestamptz not null default now(),
  foreign key (organization_id, work_order_id, comment_id)
    references public.work_order_comments(organization_id, work_order_id, id) on delete cascade
);

create index work_order_comment_attachments_comment_idx
  on public.work_order_comment_attachments (comment_id, created_at, id);

alter table public.work_order_activity enable row level security;
alter table public.work_order_comments enable row level security;
alter table public.work_order_comment_attachments enable row level security;

revoke all on public.work_order_activity from anon, authenticated;
revoke all on public.work_order_comments from anon, authenticated;
revoke all on public.work_order_comment_attachments from anon, authenticated;
grant select on public.work_order_activity to authenticated;
grant select on public.work_order_comments to authenticated;
grant select on public.work_order_comment_attachments to authenticated;

create policy "Members can view permitted Work Order activity"
  on public.work_order_activity for select to authenticated
  using (
    exists (
      select 1 from public.work_orders work_orders
      where work_orders.id = work_order_activity.work_order_id
        and work_orders.organization_id = work_order_activity.organization_id
        and public.has_work_order_permission(work_orders.id, 'work_orders.view_comments')
    )
  );

create policy "Members can view permitted Work Order comments"
  on public.work_order_comments for select to authenticated
  using (
    exists (
      select 1 from public.work_orders work_orders
      where work_orders.id = work_order_comments.work_order_id
        and work_orders.organization_id = work_order_comments.organization_id
        and public.has_work_order_permission(work_orders.id, 'work_orders.view_comments')
    )
  );

create policy "Members can view permitted Work Order comment attachments"
  on public.work_order_comment_attachments for select to authenticated
  using (
    exists (
      select 1 from public.work_orders work_orders
      where work_orders.id = work_order_comment_attachments.work_order_id
        and work_orders.organization_id = work_order_comment_attachments.organization_id
        and public.has_work_order_permission(work_orders.id, 'work_orders.view_comments')
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('work-order-comment-attachments', 'work-order-comment-attachments', false, 10485760, null)
on conflict (id) do update
set name = excluded.name, public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = null;

create policy "Members can read permitted Work Order comment files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'work-order-comment-attachments'
    and exists (
      select 1 from public.work_order_comment_attachments attachments
      where attachments.storage_path = storage.objects.name
        and public.has_work_order_permission(attachments.work_order_id, 'work_orders.view_comments')
    )
  );

create policy "Members can upload permitted Work Order comment files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'work-order-comment-attachments'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[4] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and array_length(storage.foldername(name), 1) = 4
    and split_part(name, '/', 5) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-z0-9]{1,10})?$'
    and exists (
      select 1 from public.work_orders work_orders
      where work_orders.organization_id::text = (storage.foldername(name))[1]
        and work_orders.id::text = (storage.foldername(name))[3]
        and public.has_work_order_permission(work_orders.id, 'work_orders.post_comments')
    )
  );

create policy "Uploaders can remove uncommitted Work Order comment files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'work-order-comment-attachments'
    and (storage.foldername(name))[2] = auth.uid()::text
    and not exists (
      select 1 from public.work_order_comment_attachments attachments
      where attachments.storage_path = storage.objects.name
    )
  );

create or replace function public.create_work_order_comment(
  target_organization_id uuid,
  target_work_order_id uuid,
  target_comment_id uuid,
  target_body text default null,
  target_attachments jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  created_comment public.work_order_comments;
  selected_attachment jsonb;
  selected_attachment_id uuid;
  selected_storage_path text;
  selected_byte_size bigint;
  normalized_body text := nullif(btrim(target_body), '');
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to comment on a Work Order' using errcode = '42501';
  end if;
  if target_comment_id is null then
    raise exception 'A comment ID is required';
  end if;
  if char_length(coalesce(normalized_body, '')) > 10000 then
    raise exception 'Comments cannot be longer than 10,000 characters';
  end if;
  if jsonb_typeof(target_attachments) <> 'array' or jsonb_array_length(target_attachments) > 20 then
    raise exception 'Comment attachments must be an array containing no more than 20 files';
  end if;
  if not public.has_work_order_permission(target_work_order_id, 'work_orders.post_comments')
    or not exists (
      select 1 from public.work_orders work_orders
      where work_orders.id = target_work_order_id
        and work_orders.organization_id = target_organization_id
    ) then
    raise exception 'You do not have permission to comment on this Work Order' using errcode = '42501';
  end if;
  if normalized_body is null and jsonb_array_length(target_attachments) = 0 then
    raise exception 'Write a comment or attach a file before sending';
  end if;

  insert into public.work_order_comments (id, organization_id, work_order_id, author_id, body)
  values (target_comment_id, target_organization_id, target_work_order_id, auth.uid(), normalized_body)
  returning * into created_comment;

  for selected_attachment in select value from jsonb_array_elements(target_attachments)
  loop
    selected_attachment_id := nullif(selected_attachment ->> 'id', '')::uuid;
    selected_storage_path := selected_attachment ->> 'storage_path';
    selected_byte_size := nullif(selected_attachment ->> 'byte_size', '')::bigint;

    if selected_attachment_id is null
      or selected_attachment ->> 'kind' not in ('image', 'file')
      or char_length(btrim(coalesce(selected_attachment ->> 'file_name', ''))) not between 1 and 255
      or selected_byte_size is null or selected_byte_size not between 1 and 10485760
      or char_length(coalesce(selected_attachment ->> 'content_type', '')) > 255 then
      raise exception 'Comment attachment metadata is invalid';
    end if;
    if split_part(selected_storage_path, '/', 1) <> target_organization_id::text
      or split_part(selected_storage_path, '/', 2) <> auth.uid()::text
      or split_part(selected_storage_path, '/', 3) <> target_work_order_id::text
      or split_part(selected_storage_path, '/', 4) <> target_comment_id::text
      or split_part(selected_storage_path, '/', 5) !~* ('^' || selected_attachment_id::text || '(\.[a-z0-9]{1,10})?$')
      or split_part(selected_storage_path, '/', 6) <> '' then
      raise exception 'Comment attachment path must match its organization, uploader, Work Order, and comment' using errcode = '42501';
    end if;
    if not exists (
      select 1 from storage.objects objects
      where objects.bucket_id = 'work-order-comment-attachments'
        and objects.name = selected_storage_path
    ) then
      raise exception 'Comment attachment object was not uploaded';
    end if;

    insert into public.work_order_comment_attachments (
      id, organization_id, work_order_id, comment_id, uploaded_by,
      kind, storage_path, file_name, content_type, byte_size
    ) values (
      selected_attachment_id, target_organization_id, target_work_order_id, target_comment_id,
      auth.uid(), selected_attachment ->> 'kind', selected_storage_path,
      btrim(selected_attachment ->> 'file_name'),
      coalesce(nullif(selected_attachment ->> 'content_type', ''), 'application/octet-stream'),
      selected_byte_size
    );
  end loop;

  return to_jsonb(created_comment);
end;
$$;

revoke execute on function public.create_work_order_comment(uuid, uuid, uuid, text, jsonb) from public;
grant execute on function public.create_work_order_comment(uuid, uuid, uuid, text, jsonb) to authenticated;

create or replace function public.capture_work_order_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_fields jsonb := '[]'::jsonb;
  event_actor_id uuid := coalesce(auth.uid(), new.updated_by, new.created_by);
begin
  if tg_op = 'INSERT' then
    insert into public.work_order_activity (organization_id, work_order_id, actor_id, event_type, details, created_at)
    values (
      new.organization_id, new.id, event_actor_id, 'work_order_created',
      jsonb_build_object('title', new.title), coalesce(new.created_at, now())
    );
    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.work_order_activity (organization_id, work_order_id, actor_id, event_type, details)
    values (new.organization_id, new.id, event_actor_id, 'status_changed',
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;

  if old.title is distinct from new.title then
    changed_fields := changed_fields || jsonb_build_array(jsonb_build_object('field', 'title', 'from', old.title, 'to', new.title));
  end if;
  if old.description is distinct from new.description then
    changed_fields := changed_fields || jsonb_build_array(jsonb_build_object('field', 'description'));
  end if;
  if old.priority is distinct from new.priority then
    changed_fields := changed_fields || jsonb_build_array(jsonb_build_object('field', 'priority', 'from', old.priority, 'to', new.priority));
  end if;
  if old.due_date is distinct from new.due_date or old.due_time is distinct from new.due_time or old.due_at is distinct from new.due_at then
    changed_fields := changed_fields || jsonb_build_array(jsonb_build_object('field', 'due_date'));
  end if;
  if old.start_date is distinct from new.start_date then
    changed_fields := changed_fields || jsonb_build_array(jsonb_build_object('field', 'start_date'));
  end if;
  if old.estimated_duration_minutes is distinct from new.estimated_duration_minutes then
    changed_fields := changed_fields || jsonb_build_array(jsonb_build_object('field', 'estimated_duration_minutes', 'from', old.estimated_duration_minutes, 'to', new.estimated_duration_minutes));
  end if;
  if old.work_type is distinct from new.work_type then
    changed_fields := changed_fields || jsonb_build_array(jsonb_build_object('field', 'work_type', 'from', old.work_type, 'to', new.work_type));
  end if;
  if old.requester_id is distinct from new.requester_id then
    changed_fields := changed_fields || jsonb_build_array(jsonb_build_object('field', 'requester'));
  end if;
  if old.procedure_progress is distinct from new.procedure_progress then
    changed_fields := changed_fields || jsonb_build_array(jsonb_build_object('field', 'procedure_progress', 'from', old.procedure_progress, 'to', new.procedure_progress));
  end if;
  if old.assigned_to is distinct from new.assigned_to or old.team_id is distinct from new.team_id then
    changed_fields := changed_fields || jsonb_build_array(jsonb_build_object('field', 'assignments'));
  end if;

  if jsonb_array_length(changed_fields) > 0 then
    insert into public.work_order_activity (organization_id, work_order_id, actor_id, event_type, details)
    values (new.organization_id, new.id, event_actor_id, 'work_order_updated', jsonb_build_object('changes', changed_fields));
  end if;
  return new;
end;
$$;

drop trigger if exists work_orders_capture_activity on public.work_orders;
create trigger work_orders_capture_activity
after insert or update of title, description, status, priority, due_at, due_date, due_time,
  start_date, estimated_duration_minutes, work_type, requester_id, procedure_progress,
  assigned_to, team_id
on public.work_orders
for each row execute function public.capture_work_order_activity();

insert into public.work_order_activity (organization_id, work_order_id, actor_id, event_type, details, created_at)
select work_orders.organization_id, work_orders.id, work_orders.created_by,
  'work_order_created', jsonb_build_object('title', work_orders.title), work_orders.created_at
from public.work_orders work_orders
where not exists (
  select 1 from public.work_order_activity activity
  where activity.work_order_id = work_orders.id and activity.event_type = 'work_order_created'
);

notify pgrst, 'reload schema';

select 'Work Order comments, private attachments, and activity history installed' as result;
