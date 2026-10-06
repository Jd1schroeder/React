create or replace function public.capture_work_order_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_fields jsonb := '[]'::jsonb;
  changed_column record;
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

  if old.due_date is distinct from new.due_date or old.due_time is distinct from new.due_time then
    changed_fields := changed_fields || jsonb_build_array(jsonb_build_object(
      'field', 'due_date',
      'from', jsonb_build_object('date', old.due_date, 'time', old.due_time),
      'to', jsonb_build_object('date', new.due_date, 'time', new.due_time)
    ));
  end if;

  for changed_column in
    select old_columns.key, old_columns.value as old_value, new_columns.value as new_value
    from jsonb_each(to_jsonb(old)) as old_columns(key, value)
    join jsonb_each(to_jsonb(new)) as new_columns(key, value) using (key)
    where old_columns.value is distinct from new_columns.value
      and old_columns.key not in (
        'id', 'organization_id', 'work_order_number', 'created_by', 'created_at',
        'updated_by', 'updated_at', 'status', 'due_at', 'due_date', 'due_time',
        'assigned_to', 'team_id'
      )
    order by old_columns.key
  loop
    changed_fields := changed_fields || jsonb_build_array(jsonb_build_object(
      'field', changed_column.key,
      'from', changed_column.old_value,
      'to', changed_column.new_value
    ));
  end loop;

  if jsonb_array_length(changed_fields) > 0 then
    insert into public.work_order_activity (organization_id, work_order_id, actor_id, event_type, details)
    values (new.organization_id, new.id, event_actor_id, 'work_order_updated', jsonb_build_object('changes', changed_fields));
  end if;
  return new;
end;
$$;

drop trigger if exists work_orders_capture_activity on public.work_orders;
create trigger work_orders_capture_activity
after insert or update on public.work_orders
for each row execute function public.capture_work_order_activity();

create or replace function public.capture_work_order_assignment_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_work_order_id uuid;
  target_organization_id uuid;
  target_actor_id uuid;
  before_target jsonb;
  after_target jsonb;
begin
  if tg_op = 'UPDATE' and row(old.user_id, old.team_id) is not distinct from row(new.user_id, new.team_id) then
    return new;
  end if;

  if tg_op = 'DELETE' then
    target_work_order_id := old.work_order_id;
  else
    target_work_order_id := new.work_order_id;
  end if;

  select work_orders.organization_id, coalesce(auth.uid(), work_orders.updated_by, work_orders.created_by)
    into target_organization_id, target_actor_id
  from public.work_orders work_orders
  where work_orders.id = target_work_order_id;
  if not found then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op <> 'INSERT' then
    before_target := jsonb_build_object('user_id', old.user_id, 'team_id', old.team_id);
  end if;
  if tg_op <> 'DELETE' then
    after_target := jsonb_build_object('user_id', new.user_id, 'team_id', new.team_id);
  end if;

  insert into public.work_order_activity (organization_id, work_order_id, actor_id, event_type, details)
  values (
    target_organization_id,
    target_work_order_id,
    target_actor_id,
    'work_order_updated',
    jsonb_build_object('changes', jsonb_build_array(jsonb_build_object(
      'field', 'assignment',
      'from', before_target,
      'to', after_target
    )))
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists work_order_assignments_capture_activity on public.work_order_assignments;
create trigger work_order_assignments_capture_activity
after insert or update or delete on public.work_order_assignments
for each row execute function public.capture_work_order_assignment_activity();

create or replace function public.update_work_order_with_assignments(
  target_work_order_id uuid,
  target_organization_id uuid,
  target_title text,
  target_description text default null,
  target_priority text default null,
  target_due_date date default null,
  target_due_time time default null,
  target_start_date date default null,
  target_estimated_duration_minutes integer default null,
  target_work_type text default 'reactive',
  target_assignments jsonb default null,
  target_attachments jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  updated_work_order public.work_orders;
  selected_assignment jsonb;
  selected_attachment jsonb;
  selected_user_id uuid;
  selected_team_id uuid;
  duplicate_assignment_count integer;
  selected_storage_path text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to edit a Work Order' using errcode = '42501';
  end if;
  if not public.has_work_order_permission(target_work_order_id, 'work_orders.edit') then
    raise exception 'You do not have permission to edit this Work Order' using errcode = '42501';
  end if;
  if target_title is null or btrim(target_title) = '' then
    raise exception 'A Work Order title is required';
  end if;
  if target_priority is not null and target_priority not in ('Low', 'Medium', 'High', 'Urgent') then
    raise exception 'Choose a valid Work Order priority';
  end if;
  if target_work_type not in ('reactive', 'preventive') then
    raise exception 'Choose a valid Work Type';
  end if;
  if target_estimated_duration_minutes is not null and target_estimated_duration_minutes <= 0 then
    raise exception 'Estimated time must be greater than zero minutes';
  end if;
  if target_attachments is null or jsonb_typeof(target_attachments) <> 'array' then
    raise exception 'Attachments must be an array';
  end if;

  if target_assignments is not null then
    if jsonb_typeof(target_assignments) <> 'array' then
      raise exception 'Assignments must be an array';
    end if;
    if not public.has_work_order_assignment_permission(target_work_order_id) then
      raise exception 'You do not have permission to change Work Order assignments' using errcode = '42501';
    end if;

    for selected_assignment in select value from jsonb_array_elements(target_assignments)
    loop
      selected_user_id := nullif(selected_assignment ->> 'user_id', '')::uuid;
      selected_team_id := nullif(selected_assignment ->> 'team_id', '')::uuid;
      if (selected_user_id is null) = (selected_team_id is null) then
        raise exception 'Each assignment must target exactly one user or team';
      end if;
      if not public.can_assign_work_order_target(target_organization_id, selected_user_id, selected_team_id) then
        raise exception 'You do not have permission to assign this Work Order to that target' using errcode = '42501';
      end if;
    end loop;

    select count(*) - count(distinct (nullif(assignment.value ->> 'user_id', '')::uuid, nullif(assignment.value ->> 'team_id', '')::uuid))
      into duplicate_assignment_count
    from jsonb_array_elements(target_assignments) as assignment(value);
    if duplicate_assignment_count > 0 then
      raise exception 'Each Work Order assignment target may only be selected once';
    end if;

    select nullif(assignment.value ->> 'user_id', '')::uuid
      into selected_user_id
    from jsonb_array_elements(target_assignments) with ordinality as assignment(value, position)
    where nullif(assignment.value ->> 'user_id', '') is not null
    order by assignment.position
    limit 1;
    select nullif(assignment.value ->> 'team_id', '')::uuid
      into selected_team_id
    from jsonb_array_elements(target_assignments) with ordinality as assignment(value, position)
    where nullif(assignment.value ->> 'team_id', '') is not null
    order by assignment.position
    limit 1;
  end if;

  update public.work_orders
  set title = btrim(target_title),
      description = nullif(btrim(target_description), ''),
      priority = target_priority,
      due_date = target_due_date,
      due_time = case when target_due_date is null then null else target_due_time end,
      start_date = target_start_date,
      estimated_duration_minutes = target_estimated_duration_minutes,
      work_type = target_work_type,
      assigned_to = case when target_assignments is null then work_orders.assigned_to else selected_user_id end,
      team_id = case when target_assignments is null then work_orders.team_id else selected_team_id end
  where organization_id = target_organization_id and id = target_work_order_id
  returning * into updated_work_order;

  if not found then
    raise exception 'Work Order not found in this organization';
  end if;

  if target_assignments is not null then
    delete from public.work_order_assignments existing_assignments
    where existing_assignments.organization_id = target_organization_id
      and existing_assignments.work_order_id = target_work_order_id
      and not exists (
        select 1
        from jsonb_array_elements(target_assignments) as assignment(value)
        where nullif(assignment.value ->> 'user_id', '')::uuid is not distinct from existing_assignments.user_id
          and nullif(assignment.value ->> 'team_id', '')::uuid is not distinct from existing_assignments.team_id
      );

    for selected_assignment in select value from jsonb_array_elements(target_assignments)
    loop
      selected_user_id := nullif(selected_assignment ->> 'user_id', '')::uuid;
      selected_team_id := nullif(selected_assignment ->> 'team_id', '')::uuid;
      if not exists (
        select 1 from public.work_order_assignments existing_assignments
        where existing_assignments.organization_id = target_organization_id
          and existing_assignments.work_order_id = target_work_order_id
          and existing_assignments.user_id is not distinct from selected_user_id
          and existing_assignments.team_id is not distinct from selected_team_id
      ) then
        insert into public.work_order_assignments (organization_id, work_order_id, user_id, team_id)
        values (target_organization_id, target_work_order_id, selected_user_id, selected_team_id);
      end if;
    end loop;
  end if;

  for selected_attachment in select value from jsonb_array_elements(target_attachments)
  loop
    selected_storage_path := selected_attachment ->> 'storage_path';
    if split_part(selected_storage_path, '/', 1) <> target_organization_id::text
      or split_part(selected_storage_path, '/', 2) <> auth.uid()::text
      or split_part(selected_storage_path, '/', 3) <> target_work_order_id::text then
      raise exception 'Work Order attachment path must match its organization, uploader, and Work Order' using errcode = '42501';
    end if;
    if selected_attachment ->> 'kind' not in ('image', 'file')
      or coalesce((selected_attachment ->> 'is_thumbnail')::boolean, false) then
      raise exception 'Edit attachments must be valid images or files and cannot replace the existing thumbnail';
    end if;
    insert into public.work_order_attachments (
      id, organization_id, work_order_id, kind, storage_path, file_name,
      content_type, byte_size, is_thumbnail, uploaded_by
    ) values (
      (selected_attachment ->> 'id')::uuid,
      target_organization_id,
      target_work_order_id,
      selected_attachment ->> 'kind',
      selected_storage_path,
      selected_attachment ->> 'file_name',
      coalesce(nullif(selected_attachment ->> 'content_type', ''), 'application/octet-stream'),
      (selected_attachment ->> 'byte_size')::bigint,
      false,
      auth.uid()
    );
  end loop;

  select * into updated_work_order
  from public.work_orders
  where organization_id = target_organization_id and id = target_work_order_id;
  return to_jsonb(updated_work_order);
end;
$$;

revoke execute on function public.update_work_order_with_assignments(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb) from public;
grant execute on function public.update_work_order_with_assignments(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb) to authenticated;

create or replace function public.reconcile_work_order_attachments(
  target_work_order_id uuid,
  target_organization_id uuid,
  target_attachment_state jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  selected_attachment jsonb;
  existing_attachment public.work_order_attachments;
  selected_attachment_id uuid;
  selected_storage_path text;
  selected_kind text;
  selected_file_name text;
  selected_content_type text;
  selected_byte_size bigint;
  selected_thumbnail boolean;
  retained_attachment_ids uuid[] := array[]::uuid[];
  selected_thumbnail_id uuid;
  selected_thumbnail_count integer := 0;
  old_attachment_state jsonb := '[]'::jsonb;
  new_attachment_state jsonb := '[]'::jsonb;
  removed_attachment_paths jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to edit Work Order attachments' using errcode = '42501';
  end if;
  if not public.has_work_order_permission(target_work_order_id, 'work_orders.edit') then
    raise exception 'You do not have permission to edit this Work Order' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.work_orders work_orders
    where work_orders.id = target_work_order_id
      and work_orders.organization_id = target_organization_id
  ) then
    raise exception 'Work Order not found in this organization';
  end if;
  if target_attachment_state is null or jsonb_typeof(target_attachment_state) <> 'array' then
    raise exception 'Attachment state must be an array';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', attachments.id,
    'kind', attachments.kind,
    'file_name', attachments.file_name,
    'content_type', attachments.content_type,
    'byte_size', attachments.byte_size,
    'is_thumbnail', attachments.is_thumbnail
  ) order by attachments.id), '[]'::jsonb)
  into old_attachment_state
  from public.work_order_attachments attachments
  where attachments.organization_id = target_organization_id
    and attachments.work_order_id = target_work_order_id
    and not exists (
      select 1 from jsonb_array_elements(target_attachment_state) requested(value)
      where coalesce((requested.value ->> 'existing')::boolean, false) = false
        and nullif(requested.value ->> 'id', '')::uuid = attachments.id
    );

  for selected_attachment in select value from jsonb_array_elements(target_attachment_state)
  loop
    if jsonb_typeof(selected_attachment) <> 'object' then
      raise exception 'Each attachment state item must be an object';
    end if;
    selected_attachment_id := nullif(selected_attachment ->> 'id', '')::uuid;
    if selected_attachment_id is null or selected_attachment_id = any(retained_attachment_ids) then
      raise exception 'Attachment IDs must be present and unique';
    end if;
    selected_thumbnail := coalesce((selected_attachment ->> 'is_thumbnail')::boolean, false);

    if coalesce((selected_attachment ->> 'existing')::boolean, false) then
      select * into existing_attachment
      from public.work_order_attachments attachments
      where attachments.id = selected_attachment_id
        and attachments.organization_id = target_organization_id
        and attachments.work_order_id = target_work_order_id;
      if not found then
        raise exception 'Existing attachment does not belong to this Work Order';
      end if;
      if selected_thumbnail and existing_attachment.kind <> 'image' then
        raise exception 'Only a Work Order image can be selected as the thumbnail';
      end if;
      retained_attachment_ids := array_append(retained_attachment_ids, selected_attachment_id);
    else
      selected_storage_path := selected_attachment ->> 'storage_path';
      selected_kind := selected_attachment ->> 'kind';
      selected_file_name := btrim(selected_attachment ->> 'file_name');
      selected_content_type := coalesce(nullif(selected_attachment ->> 'content_type', ''), 'application/octet-stream');
      selected_byte_size := nullif(selected_attachment ->> 'byte_size', '')::bigint;

      if selected_storage_path is null
        or array_length(string_to_array(selected_storage_path, '/'), 1) <> 4
        or split_part(selected_storage_path, '/', 1) <> target_organization_id::text
        or split_part(selected_storage_path, '/', 2) <> auth.uid()::text
        or split_part(selected_storage_path, '/', 3) <> target_work_order_id::text then
        raise exception 'New attachment path must match its organization, uploader, and Work Order' using errcode = '42501';
      end if;
      if selected_kind not in ('image', 'file')
        or (selected_kind = 'image' and selected_content_type not like 'image/%')
        or (selected_thumbnail and selected_kind <> 'image') then
        raise exception 'New Work Order attachment type or thumbnail is invalid';
      end if;
      if selected_file_name is null or char_length(selected_file_name) not between 1 and 255
        or selected_byte_size is null or selected_byte_size not between 1 and 10485760 then
        raise exception 'New Work Order attachment metadata is invalid';
      end if;
      if not exists (
        select 1 from storage.objects objects
        where objects.bucket_id = 'work-order-attachments'
          and objects.name = selected_storage_path
      ) then
        raise exception 'Work Order attachment object was not uploaded';
      end if;
      retained_attachment_ids := array_append(retained_attachment_ids, selected_attachment_id);
    end if;

    if selected_thumbnail then
      selected_thumbnail_count := selected_thumbnail_count + 1;
      selected_thumbnail_id := selected_attachment_id;
    end if;
  end loop;

  if selected_thumbnail_count > 1 then
    raise exception 'A Work Order can have only one thumbnail';
  end if;

  with removed as (
    delete from public.work_order_attachments attachments
    where attachments.organization_id = target_organization_id
      and attachments.work_order_id = target_work_order_id
      and not (attachments.id = any(retained_attachment_ids))
    returning attachments.storage_path
  )
  select coalesce(jsonb_agg(removed.storage_path), '[]'::jsonb)
    into removed_attachment_paths
  from removed;

  update public.work_order_attachments attachments
  set is_thumbnail = false
  where attachments.organization_id = target_organization_id
    and attachments.work_order_id = target_work_order_id
    and attachments.is_thumbnail
    and attachments.id is distinct from selected_thumbnail_id;

  for selected_attachment in select value from jsonb_array_elements(target_attachment_state)
  loop
    if not coalesce((selected_attachment ->> 'existing')::boolean, false) then
      insert into public.work_order_attachments (
        id, organization_id, work_order_id, kind, storage_path, file_name,
        content_type, byte_size, is_thumbnail, uploaded_by
      ) values (
        (selected_attachment ->> 'id')::uuid,
        target_organization_id,
        target_work_order_id,
        selected_attachment ->> 'kind',
        selected_attachment ->> 'storage_path',
        btrim(selected_attachment ->> 'file_name'),
        coalesce(nullif(selected_attachment ->> 'content_type', ''), 'application/octet-stream'),
        (selected_attachment ->> 'byte_size')::bigint,
        false,
        auth.uid()
      );
    end if;
  end loop;

  if selected_thumbnail_id is not null then
    update public.work_order_attachments attachments
    set is_thumbnail = true
    where attachments.id = selected_thumbnail_id
      and attachments.organization_id = target_organization_id
      and attachments.work_order_id = target_work_order_id
      and not attachments.is_thumbnail;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', attachments.id,
    'kind', attachments.kind,
    'file_name', attachments.file_name,
    'content_type', attachments.content_type,
    'byte_size', attachments.byte_size,
    'is_thumbnail', attachments.is_thumbnail
  ) order by attachments.id), '[]'::jsonb)
  into new_attachment_state
  from public.work_order_attachments attachments
  where attachments.organization_id = target_organization_id
    and attachments.work_order_id = target_work_order_id;

  if old_attachment_state is distinct from new_attachment_state then
    insert into public.work_order_activity (organization_id, work_order_id, actor_id, event_type, details)
    values (
      target_organization_id,
      target_work_order_id,
      auth.uid(),
      'work_order_updated',
      jsonb_build_object('changes', jsonb_build_array(jsonb_build_object(
        'field', 'attachments',
        'from', old_attachment_state,
        'to', new_attachment_state
      )))
    );
  end if;

  return removed_attachment_paths;
end;
$$;

revoke execute on function public.reconcile_work_order_attachments(uuid, uuid, jsonb) from public;
grant execute on function public.reconcile_work_order_attachments(uuid, uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';

select 'Work Order before-and-after activity tracking installed' as result;
