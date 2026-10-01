-- RLS policy subqueries against work_orders were filtered by the caller's own
-- view scope during creation. Check ownership/permissions through narrowly
-- scoped security-definer helpers instead, without widening record visibility.

create or replace function public.is_work_order_creator_with_create_permission(
  target_work_order_id uuid,
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.work_orders work_orders
    where work_orders.id = target_work_order_id
      and work_orders.organization_id = target_organization_id
      and work_orders.created_by = auth.uid()
      and public.has_organization_permission(target_organization_id, 'work_orders.create', 'own')
  );
$$;

create or replace function public.can_add_work_order_assignment(
  target_work_order_id uuid,
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_work_order_creator_with_create_permission(target_work_order_id, target_organization_id)
    or public.has_work_order_assignment_permission(target_work_order_id);
$$;

create or replace function public.can_add_work_order_attachment(
  target_work_order_id uuid,
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_work_order_creator_with_create_permission(target_work_order_id, target_organization_id)
    or public.has_work_order_permission(target_work_order_id, 'work_orders.edit');
$$;

revoke execute on function public.is_work_order_creator_with_create_permission(uuid, uuid) from public;
revoke execute on function public.can_add_work_order_assignment(uuid, uuid) from public;
revoke execute on function public.can_add_work_order_attachment(uuid, uuid) from public;
grant execute on function public.is_work_order_creator_with_create_permission(uuid, uuid) to authenticated;
grant execute on function public.can_add_work_order_assignment(uuid, uuid) to authenticated;
grant execute on function public.can_add_work_order_attachment(uuid, uuid) to authenticated;

drop policy if exists "Authorized members can create Work Order assignments" on public.work_order_assignments;
create policy "Authorized members can create Work Order assignments"
  on public.work_order_assignments for insert to authenticated
  with check (
    public.can_assign_work_order_target(organization_id, user_id, team_id)
    and public.can_add_work_order_assignment(work_order_id, organization_id)
  );

drop policy if exists "Authorized members can delete Work Order assignments" on public.work_order_assignments;
create policy "Authorized members can delete Work Order assignments"
  on public.work_order_assignments for delete to authenticated
  using (
    (public.has_work_order_assignment_permission(work_order_id)
      and public.can_assign_work_order_target(organization_id, user_id, team_id))
    or public.is_work_order_creator_with_create_permission(work_order_id, organization_id)
  );

drop policy if exists "Authorized members can add Work Order attachments" on public.work_order_attachments;
create policy "Authorized members can add Work Order attachments"
  on public.work_order_attachments for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.can_add_work_order_attachment(work_order_id, organization_id)
  );

drop policy if exists "Authorized members can remove Work Order attachments" on public.work_order_attachments;
create policy "Authorized members can remove Work Order attachments"
  on public.work_order_attachments for delete to authenticated
  using (
    uploaded_by = auth.uid()
    and (
      public.has_work_order_permission(work_order_id, 'work_orders.edit')
      or public.is_work_order_creator_with_create_permission(work_order_id, organization_id)
    )
  );

-- New foreign keys are discovered by PostgREST embeds after the schema cache refresh.
notify pgrst, 'reload schema';

select 'Work Order creation RLS visibility checks corrected' as result;
