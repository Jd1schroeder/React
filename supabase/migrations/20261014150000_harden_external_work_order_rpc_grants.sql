-- Normalize ACLs for already-deployed External Work Order RPCs. Explicitly
-- revoke from browser roles before granting only the intended audience so
-- inherited/default PUBLIC privileges cannot expose management or contact RPCs.
revoke all on function public.create_work_order_external_share(uuid) from public, anon, authenticated;
grant execute on function public.create_work_order_external_share(uuid) to authenticated;

revoke all on function public.get_work_order_external_share(uuid) from public, anon, authenticated;
grant execute on function public.get_work_order_external_share(uuid) to authenticated;

revoke all on function public.disable_work_order_external_share(uuid) from public, anon, authenticated;
grant execute on function public.disable_work_order_external_share(uuid) to authenticated;

revoke all on function public.reset_work_order_external_share(uuid) from public, anon, authenticated;
grant execute on function public.reset_work_order_external_share(uuid) to authenticated;

revoke all on function public.list_work_order_external_share_contacts(uuid) from public, anon, authenticated;
grant execute on function public.list_work_order_external_share_contacts(uuid) to authenticated;

revoke all on function public.set_work_order_external_share_contacts(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.set_work_order_external_share_contacts(uuid, jsonb) to authenticated;

revoke all on function public.get_external_work_order(text) from public, anon, authenticated;
grant execute on function public.get_external_work_order(text) to anon, authenticated;

revoke all on function public.post_external_work_order_comment(text, text, text, text) from public, anon, authenticated;
grant execute on function public.post_external_work_order_comment(text, text, text, text) to anon, authenticated;

revoke all on function public.mark_external_work_order_finished(text, text) from public, anon, authenticated;
grant execute on function public.mark_external_work_order_finished(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
