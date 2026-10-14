-- The anonymous External Work Order RPCs hash bearer tokens with pgcrypto.digest.
-- Resolve that trusted extension explicitly for already-deployed functions.
alter function public.get_external_work_order(text)
  set search_path = public, extensions;
alter function public.post_external_work_order_comment(text, text, text, text)
  set search_path = public, extensions;
alter function public.mark_external_work_order_finished(text, text)
  set search_path = public, extensions;

notify pgrst, 'reload schema';
