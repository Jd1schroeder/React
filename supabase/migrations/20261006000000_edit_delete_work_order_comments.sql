alter table public.work_order_comments
  add column edited_at timestamptz,
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id) on delete set null,
  add constraint work_order_comments_deleted_body_redacted_check
    check (deleted_at is null or body is null);

create or replace function public.update_work_order_comment(
  target_organization_id uuid,
  target_work_order_id uuid,
  target_comment_id uuid,
  target_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_comment public.work_order_comments;
  normalized_body text := nullif(btrim(target_body), '');
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to edit a comment' using errcode = '42501';
  end if;
  if char_length(coalesce(normalized_body, '')) > 10000 then
    raise exception 'Comments cannot be longer than 10,000 characters';
  end if;

  select comments.* into selected_comment
  from public.work_order_comments comments
  where comments.id = target_comment_id
    and comments.organization_id = target_organization_id
    and comments.work_order_id = target_work_order_id
  for update;
  if not found or selected_comment.deleted_at is not null then
    raise exception 'Comment not found or already deleted';
  end if;
  if selected_comment.author_id is distinct from auth.uid()
    or not public.has_work_order_permission(target_work_order_id, 'work_orders.post_comments') then
    raise exception 'You can only edit your own comments' using errcode = '42501';
  end if;
  if normalized_body is null and not exists (
    select 1 from public.work_order_comment_attachments attachments
    where attachments.comment_id = target_comment_id
  ) then
    raise exception 'Write a comment or attach a file before saving';
  end if;

  if selected_comment.body is distinct from normalized_body then
    update public.work_order_comments comments
    set body = normalized_body,
        edited_at = now()
    where comments.id = target_comment_id
      and comments.organization_id = target_organization_id
      and comments.work_order_id = target_work_order_id
    returning comments.* into selected_comment;
  end if;

  return to_jsonb(selected_comment);
end;
$$;

revoke all on function public.update_work_order_comment(uuid, uuid, uuid, text) from public;
grant execute on function public.update_work_order_comment(uuid, uuid, uuid, text) to authenticated;

create or replace function public.delete_work_order_comment(
  target_organization_id uuid,
  target_work_order_id uuid,
  target_comment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_comment public.work_order_comments;
  selected_attachment_paths text[] := array[]::text[];
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to delete a comment' using errcode = '42501';
  end if;

  select comments.* into selected_comment
  from public.work_order_comments comments
  where comments.id = target_comment_id
    and comments.organization_id = target_organization_id
    and comments.work_order_id = target_work_order_id
  for update;
  if not found then
    raise exception 'Comment not found';
  end if;
  if not exists (
    select 1 from public.work_orders work_orders
    where work_orders.id = target_work_order_id
      and work_orders.organization_id = target_organization_id
  ) then
    raise exception 'Work Order not found';
  end if;
  if not public.is_organization_admin(target_organization_id)
    and (
      selected_comment.author_id is distinct from auth.uid()
      or not public.has_work_order_permission(target_work_order_id, 'work_orders.post_comments')
    ) then
    raise exception 'You can only delete your own comments' using errcode = '42501';
  end if;

  if selected_comment.deleted_at is not null then
    return jsonb_build_object('deleted_at', selected_comment.deleted_at, 'attachment_paths', selected_attachment_paths);
  end if;

  select coalesce(array_agg(attachments.storage_path), array[]::text[])
    into selected_attachment_paths
  from public.work_order_comment_attachments attachments
  where attachments.organization_id = target_organization_id
    and attachments.work_order_id = target_work_order_id
    and attachments.comment_id = target_comment_id;

  delete from public.work_order_comment_attachments attachments
  where attachments.organization_id = target_organization_id
    and attachments.work_order_id = target_work_order_id
    and attachments.comment_id = target_comment_id;

  update public.work_order_comments comments
  set body = null,
      deleted_at = now(),
      deleted_by = auth.uid()
  where comments.id = target_comment_id
    and comments.organization_id = target_organization_id
    and comments.work_order_id = target_work_order_id
  returning comments.* into selected_comment;

  return jsonb_build_object(
    'deleted_at', selected_comment.deleted_at,
    'attachment_paths', to_jsonb(selected_attachment_paths)
  );
end;
$$;

revoke all on function public.delete_work_order_comment(uuid, uuid, uuid) from public;
grant execute on function public.delete_work_order_comment(uuid, uuid, uuid) to authenticated;

create policy "Organization admins can remove deleted Work Order comment files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'work-order-comment-attachments'
    and array_length(storage.foldername(name), 1) = 4
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[4] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and split_part(name, '/', 5) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-z0-9]{1,10})?$'
    and exists (
      select 1 from public.work_order_comments comments
      where comments.organization_id::text = (storage.foldername(name))[1]
        and comments.work_order_id::text = (storage.foldername(name))[3]
        and comments.id::text = (storage.foldername(name))[4]
        and comments.deleted_at is not null
        and public.is_organization_admin(comments.organization_id)
    )
  );

notify pgrst, 'reload schema';

select 'Work Order comment editing and deletion installed' as result;
