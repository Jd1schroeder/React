-- Persist the fields collected by the Work Order creation form while retaining
-- the legacy due_at/assigned_to/team_id columns during the client transition.

alter table public.work_orders
  add column if not exists due_date date,
  add column if not exists due_time time,
  add column if not exists start_date date,
  add column if not exists estimated_duration_minutes integer,
  add column if not exists work_type text not null default 'reactive';

update public.work_orders work_orders
set due_date = (work_orders.due_at at time zone coalesce(nullif(organizations.timezone, ''), 'UTC'))::date,
    due_time = case
      when (work_orders.due_at at time zone coalesce(nullif(organizations.timezone, ''), 'UTC'))::time = time '23:59:59' then null
      else (work_orders.due_at at time zone coalesce(nullif(organizations.timezone, ''), 'UTC'))::time
    end
from public.organizations organizations
where organizations.id = work_orders.organization_id
  and work_orders.due_at is not null
  and work_orders.due_date is null;

alter table public.work_orders alter column priority drop not null;
alter table public.work_orders alter column priority drop default;
alter table public.work_orders drop constraint if exists work_orders_priority_check;
alter table public.work_orders
  add constraint work_orders_priority_check
  check (priority is null or priority in ('Low', 'Medium', 'High', 'Urgent'));

alter table public.work_orders
  add constraint work_orders_due_time_requires_date_check
  check (due_time is null or due_date is not null),
  add constraint work_orders_estimated_duration_check
  check (estimated_duration_minutes is null or estimated_duration_minutes > 0),
  add constraint work_orders_work_type_check
  check (work_type in ('reactive', 'preventive'));

create or replace function public.sync_work_order_due_at()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  organization_timezone text;
  local_due timestamp without time zone;
begin
  select coalesce(nullif(timezone, ''), 'UTC')
    into organization_timezone
  from public.organizations
  where id = new.organization_id;

  if tg_op = 'UPDATE'
    and new.due_at is distinct from old.due_at
    and new.due_date is not distinct from old.due_date
    and new.due_time is not distinct from old.due_time then
    -- Honor updates from older clients even after the row has been backfilled.
    local_due := new.due_at at time zone organization_timezone;
    new.due_date := local_due::date;
    new.due_time := case when local_due::time = time '23:59:59' then null else local_due::time end;
  elsif new.due_date is null and new.due_at is not null then
    -- Accept writes from older clients during a rolling deployment.
    local_due := new.due_at at time zone organization_timezone;
    new.due_date := local_due::date;
    new.due_time := case when local_due::time = time '23:59:59' then null else local_due::time end;
  elsif new.due_date is null then
    new.due_time := null;
    new.due_at := null;
  else
    local_due := new.due_date + coalesce(new.due_time, time '23:59:59');
    new.due_at := local_due at time zone organization_timezone;
  end if;
  return new;
end;
$$;

drop trigger if exists work_orders_sync_due_at on public.work_orders;
create trigger work_orders_sync_due_at
before insert or update of organization_id, due_at, due_date, due_time on public.work_orders
for each row execute function public.sync_work_order_due_at();

create unique index if not exists work_orders_organization_id_unique_idx
  on public.work_orders(organization_id, id);

create table if not exists public.work_order_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_order_id uuid not null,
  user_id uuid references auth.users(id) on delete cascade,
  team_id uuid references public.organization_teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint work_order_assignments_single_target_check
    check ((user_id is not null) <> (team_id is not null)),
  constraint work_order_assignments_work_order_fk
    foreign key (organization_id, work_order_id)
    references public.work_orders(organization_id, id) on delete cascade
);

create unique index if not exists work_order_assignments_user_unique_idx
  on public.work_order_assignments(work_order_id, user_id) where user_id is not null;
create unique index if not exists work_order_assignments_team_unique_idx
  on public.work_order_assignments(work_order_id, team_id) where team_id is not null;
create index if not exists work_order_assignments_user_lookup_idx
  on public.work_order_assignments(organization_id, user_id, work_order_id) where user_id is not null;
create index if not exists work_order_assignments_team_lookup_idx
  on public.work_order_assignments(organization_id, team_id, work_order_id) where team_id is not null;

insert into public.work_order_assignments (organization_id, work_order_id, user_id)
select organization_id, id, assigned_to from public.work_orders where assigned_to is not null
on conflict do nothing;
insert into public.work_order_assignments (organization_id, work_order_id, team_id)
select organization_id, id, team_id from public.work_orders where team_id is not null
on conflict do nothing;

create table if not exists public.work_order_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_order_id uuid not null,
  kind text not null check (kind in ('image', 'file')),
  storage_path text not null unique,
  file_name text not null check (char_length(btrim(file_name)) between 1 and 255),
  content_type text not null default 'application/octet-stream',
  byte_size bigint not null check (byte_size > 0 and byte_size <= 10485760),
  is_thumbnail boolean not null default false,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint work_order_attachments_work_order_fk
    foreign key (organization_id, work_order_id)
    references public.work_orders(organization_id, id) on delete cascade,
  constraint work_order_attachments_thumbnail_kind_check
    check (kind = 'image' or not is_thumbnail)
);

create unique index if not exists work_order_attachments_thumbnail_unique_idx
  on public.work_order_attachments(work_order_id) where is_thumbnail;
create index if not exists work_order_attachments_work_order_idx
  on public.work_order_attachments(organization_id, work_order_id, created_at);

alter table public.work_order_assignments enable row level security;
alter table public.work_order_attachments enable row level security;

create or replace function public.has_work_order_permission(target_work_order_id uuid, target_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.work_orders work_orders
    join public.organizations organizations on organizations.id = work_orders.organization_id and organizations.status = 'active'
    join public.organization_members members on members.organization_id = work_orders.organization_id
      and members.user_id = auth.uid() and members.status = 'active'
    join public.organization_role_permissions grants on grants.role_id = members.role_id
      and grants.permission_key = target_permission_key
    where work_orders.id = target_work_order_id
      and (
        grants.scope = 'any'
        or (grants.scope = 'own' and work_orders.created_by = auth.uid())
        or (grants.scope = 'assigned' and (
          work_orders.assigned_to = auth.uid()
          or exists (
            select 1 from public.work_order_assignments assignments
            where assignments.work_order_id = work_orders.id
              and (assignments.user_id = auth.uid() or exists (
                select 1 from public.organization_team_members team_members
                where team_members.team_id = assignments.team_id and team_members.user_id = auth.uid()
              ))
          )
        ))
        or (grants.scope = 'team' and (
          exists (
            select 1 from public.work_order_assignments assignments
            join public.organization_team_members team_members on team_members.team_id = assignments.team_id
            where assignments.work_order_id = work_orders.id and team_members.user_id = auth.uid()
          )
          or exists (
            select 1 from public.organization_team_members team_members
            where team_members.team_id = work_orders.team_id and team_members.user_id = auth.uid()
          )
        ))
      )
  );
$$;

revoke execute on function public.has_work_order_permission(uuid, text) from public;
grant execute on function public.has_work_order_permission(uuid, text) to authenticated;

create or replace function public.enforce_work_order_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return new; end if;
  if old.organization_id is distinct from new.organization_id then
    raise exception 'Work Order organization cannot be changed';
  end if;

  if old.title is distinct from new.title
    or old.description is distinct from new.description
    or old.priority is distinct from new.priority
    or old.due_at is distinct from new.due_at
    or old.due_date is distinct from new.due_date
    or old.due_time is distinct from new.due_time
    or old.start_date is distinct from new.start_date
    or old.estimated_duration_minutes is distinct from new.estimated_duration_minutes
    or old.work_type is distinct from new.work_type
    or old.requester_id is distinct from new.requester_id then
    if not public.has_work_order_permission(old.id, 'work_orders.edit') then
      raise exception 'You do not have permission to edit core Work Order details';
    end if;
  end if;

  if old.assigned_to is distinct from new.assigned_to or old.team_id is distinct from new.team_id then
    if not public.has_work_order_assignment_permission(old.id) then
      raise exception 'You do not have permission to assign this Work Order';
    end if;
    if (new.assigned_to is not null or new.team_id is not null)
      and not public.can_assign_work_order_target(new.organization_id, new.assigned_to, new.team_id) then
      raise exception 'You may only assign Work Orders to users or teams within your assignment scope';
    end if;
  end if;

  if old.status is distinct from new.status
    and not public.has_work_order_permission(old.id, 'work_orders.change_status') then
    raise exception 'You do not have permission to change Work Order status';
  end if;

  if old.procedure_progress is distinct from new.procedure_progress
    and not public.has_work_order_permission(old.id, 'work_orders.fill_procedure') then
    raise exception 'You do not have permission to update procedure progress';
  end if;

  new.updated_by = auth.uid();
  return new;
end;
$$;

create or replace function public.can_assign_work_order_target(target_organization_id uuid, target_user_id uuid, target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members caller
    join public.organizations organizations on organizations.id = caller.organization_id and organizations.status = 'active'
    join public.organization_role_permissions grants on grants.role_id = caller.role_id
      and grants.permission_key = 'work_orders.assign'
    where caller.organization_id = target_organization_id
      and caller.user_id = auth.uid() and caller.status = 'active'
      and (
        grants.scope = 'any'
        or (grants.scope = 'team' and (
          (target_team_id is not null and exists (
            select 1 from public.organization_team_members
            where team_id = target_team_id and user_id = auth.uid()
          ))
          or (target_user_id is not null and exists (
            select 1 from public.organization_team_members caller_team
            join public.organization_team_members target_team on target_team.team_id = caller_team.team_id
            where caller_team.user_id = auth.uid() and target_team.user_id = target_user_id
          ))
        ))
      )
  );
$$;

revoke execute on function public.can_assign_work_order_target(uuid, uuid, uuid) from public;
grant execute on function public.can_assign_work_order_target(uuid, uuid, uuid) to authenticated;

create or replace function public.has_work_order_assignment_permission(target_work_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.work_orders work_orders
    join public.organizations organizations on organizations.id = work_orders.organization_id and organizations.status = 'active'
    join public.organization_members members on members.organization_id = work_orders.organization_id
      and members.user_id = auth.uid() and members.status = 'active'
    join public.organization_role_permissions grants on grants.role_id = members.role_id
      and grants.permission_key = 'work_orders.assign'
    where work_orders.id = target_work_order_id
      and (
        grants.scope = 'any'
        or (grants.scope = 'team' and exists (
          select 1 from public.organization_team_members team_members
          join public.organization_teams teams on teams.id = team_members.team_id
          where teams.organization_id = work_orders.organization_id and team_members.user_id = auth.uid()
        ))
      )
  );
$$;

revoke execute on function public.has_work_order_assignment_permission(uuid) from public;
grant execute on function public.has_work_order_assignment_permission(uuid) to authenticated;

create or replace function public.validate_work_order_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null and not exists (
    select 1 from public.organization_members members
    where members.organization_id = new.organization_id
      and members.user_id = new.user_id and members.status = 'active'
  ) then
    raise exception 'Assigned users must be active members of the Work Order organization';
  end if;
  if new.team_id is not null and not exists (
    select 1 from public.organization_teams teams
    where teams.id = new.team_id and teams.organization_id = new.organization_id
  ) then
    raise exception 'Assigned teams must belong to the Work Order organization';
  end if;
  return new;
end;
$$;

drop trigger if exists work_order_assignments_validate_target on public.work_order_assignments;
create trigger work_order_assignments_validate_target
before insert or update on public.work_order_assignments
for each row execute function public.validate_work_order_assignment();

create or replace function public.validate_work_order_attachment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.work_orders work_orders
    where work_orders.id = new.work_order_id and work_orders.organization_id = new.organization_id
      and (
        work_orders.created_by = auth.uid()
        or public.has_work_order_permission(work_orders.id, 'work_orders.edit')
      )
  ) then
    raise exception 'Attachment must belong to a Work Order the current user can create or edit';
  end if;
  if new.uploaded_by is distinct from auth.uid() then
    raise exception 'Attachment uploader must be the current user';
  end if;
  return new;
end;
$$;

drop trigger if exists work_order_attachments_validate on public.work_order_attachments;
create trigger work_order_attachments_validate
before insert or update on public.work_order_attachments
for each row execute function public.validate_work_order_attachment();

drop policy if exists "Members can view permitted work orders" on public.work_orders;
create policy "Members can view permitted work orders"
  on public.work_orders for select to authenticated
  using (public.has_work_order_permission(id, 'work_orders.view'));

drop policy if exists "Members can update permitted work orders" on public.work_orders;
create policy "Members can update permitted work orders"
  on public.work_orders for update to authenticated
  using (
    public.has_work_order_permission(id, 'work_orders.edit')
    or public.has_work_order_assignment_permission(id)
    or public.has_work_order_permission(id, 'work_orders.change_status')
    or public.has_work_order_permission(id, 'work_orders.fill_procedure')
  )
  with check (
    public.has_work_order_permission(id, 'work_orders.edit')
    or public.has_work_order_assignment_permission(id)
    or public.has_work_order_permission(id, 'work_orders.change_status')
    or public.has_work_order_permission(id, 'work_orders.fill_procedure')
  );

drop policy if exists "Members can delete permitted work orders" on public.work_orders;
create policy "Members can delete permitted work orders"
  on public.work_orders for delete to authenticated
  using (public.has_work_order_permission(id, 'work_orders.delete'));

create policy "Members can view permitted Work Order assignments"
  on public.work_order_assignments for select to authenticated
  using (public.has_work_order_permission(work_order_id, 'work_orders.view'));
create policy "Authorized members can create Work Order assignments"
  on public.work_order_assignments for insert to authenticated
  with check (
    public.can_assign_work_order_target(organization_id, user_id, team_id)
    and exists (
      select 1 from public.work_orders work_orders
      where work_orders.id = work_order_assignments.work_order_id
        and work_orders.organization_id = work_order_assignments.organization_id
        and (work_orders.created_by = auth.uid() or public.has_work_order_assignment_permission(work_orders.id))
    )
  );
create policy "Authorized members can update Work Order assignments"
  on public.work_order_assignments for update to authenticated
  using (
    public.has_work_order_assignment_permission(work_order_id)
    and public.can_assign_work_order_target(organization_id, user_id, team_id)
  )
  with check (
    public.has_work_order_assignment_permission(work_order_id)
    and public.can_assign_work_order_target(organization_id, user_id, team_id)
  );
create policy "Authorized members can delete Work Order assignments"
  on public.work_order_assignments for delete to authenticated
  using (
    (public.has_work_order_assignment_permission(work_order_id)
      and public.can_assign_work_order_target(organization_id, user_id, team_id))
    or exists (
      select 1 from public.work_orders work_orders
      where work_orders.id = work_order_assignments.work_order_id
        and work_orders.created_by = auth.uid()
        and public.has_organization_permission(organization_id, 'work_orders.create', 'own')
    )
  );

create policy "Members can view permitted Work Order attachments"
  on public.work_order_attachments for select to authenticated
  using (public.has_work_order_permission(work_order_id, 'work_orders.view'));
create policy "Authorized members can add Work Order attachments"
  on public.work_order_attachments for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.work_orders work_orders
      where work_orders.id = work_order_attachments.work_order_id
        and work_orders.organization_id = work_order_attachments.organization_id
        and (
          (work_orders.created_by = auth.uid() and public.has_organization_permission(organization_id, 'work_orders.create', 'own'))
          or public.has_work_order_permission(work_orders.id, 'work_orders.edit')
        )
    )
  );
create policy "Authorized members can remove Work Order attachments"
  on public.work_order_attachments for delete to authenticated
  using (
    uploaded_by = auth.uid()
    and (
      public.has_work_order_permission(work_order_id, 'work_orders.edit')
      or exists (
        select 1 from public.work_orders work_orders
        where work_orders.id = work_order_attachments.work_order_id
          and work_orders.created_by = auth.uid()
          and public.has_organization_permission(organization_id, 'work_orders.create', 'own')
      )
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('work-order-attachments', 'work-order-attachments', false, 10485760, null)
on conflict (id) do update set name = excluded.name, public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = null;

create policy "Members can read permitted Work Order attachment objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'work-order-attachments'
    and exists (
      select 1 from public.work_order_attachments attachments
      where attachments.storage_path = storage.objects.name
        and public.has_work_order_permission(attachments.work_order_id, 'work_orders.view')
    )
  );
create policy "Authorized members can upload Work Order attachment objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'work-order-attachments'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.has_organization_permission(((storage.foldername(name))[1])::uuid, 'work_orders.create', 'own')
  );
create policy "Uploaders can remove Work Order attachment objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'work-order-attachments'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create or replace function public.create_work_order_with_assignments(
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
  target_assignments jsonb default '[]'::jsonb,
  target_attachments jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  created_work_order public.work_orders;
  selected_assignment jsonb;
  selected_user_id uuid;
  selected_team_id uuid;
  selected_attachment jsonb;
begin
  if auth.uid() is null then raise exception 'You must be signed in to create a Work Order'; end if;
  if jsonb_typeof(target_assignments) <> 'array' or jsonb_typeof(target_attachments) <> 'array' then
    raise exception 'Assignments and attachments must be arrays';
  end if;

  select nullif(assignment.value ->> 'user_id', '')::uuid
    into selected_user_id
  from jsonb_array_elements(target_assignments) as assignment(value)
  where nullif(assignment.value ->> 'user_id', '') is not null
  limit 1;
  select nullif(assignment.value ->> 'team_id', '')::uuid
    into selected_team_id
  from jsonb_array_elements(target_assignments) as assignment(value)
  where nullif(assignment.value ->> 'team_id', '') is not null
  limit 1;

  insert into public.work_orders (
    id, organization_id, title, description, priority, due_date, due_time,
    start_date, estimated_duration_minutes, work_type, assigned_to, team_id, created_by
  ) values (
    target_work_order_id, target_organization_id, target_title, nullif(btrim(target_description), ''), target_priority,
    target_due_date, target_due_time, target_start_date, nullif(target_estimated_duration_minutes, 0),
    target_work_type, selected_user_id, selected_team_id, auth.uid()
  ) returning * into created_work_order;

  for selected_assignment in select value from jsonb_array_elements(target_assignments)
  loop
    insert into public.work_order_assignments (organization_id, work_order_id, user_id, team_id)
    values (
      target_organization_id,
      target_work_order_id,
      nullif(selected_assignment ->> 'user_id', '')::uuid,
      nullif(selected_assignment ->> 'team_id', '')::uuid
    );
  end loop;

  for selected_attachment in select value from jsonb_array_elements(target_attachments)
  loop
    insert into public.work_order_attachments (
      id, organization_id, work_order_id, kind, storage_path, file_name,
      content_type, byte_size, is_thumbnail, uploaded_by
    ) values (
      (selected_attachment ->> 'id')::uuid,
      target_organization_id,
      target_work_order_id,
      selected_attachment ->> 'kind',
      selected_attachment ->> 'storage_path',
      selected_attachment ->> 'file_name',
      coalesce(nullif(selected_attachment ->> 'content_type', ''), 'application/octet-stream'),
      (selected_attachment ->> 'byte_size')::bigint,
      coalesce((selected_attachment ->> 'is_thumbnail')::boolean, false),
      auth.uid()
    );
  end loop;

  return to_jsonb(created_work_order);
end;
$$;

revoke execute on function public.create_work_order_with_assignments(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb) from public;
grant execute on function public.create_work_order_with_assignments(uuid, uuid, text, text, text, date, time, date, integer, text, jsonb, jsonb) to authenticated;

select 'Work Order creation fields, assignments, and attachments installed' as result;
