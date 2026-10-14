-- Supabase installs pgcrypto in the extensions schema. Keep the SECURITY DEFINER
-- token-generation function explicit about that trusted schema so link creation
-- does not depend on the database role's default search_path.
alter function public.create_work_order_external_share(uuid)
  set search_path = public, extensions;

notify pgrst, 'reload schema';
