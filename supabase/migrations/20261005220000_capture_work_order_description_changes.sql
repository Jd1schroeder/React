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
    changed_fields := changed_fields || jsonb_build_array(jsonb_build_object('field', 'description', 'from', old.description, 'to', new.description));
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
