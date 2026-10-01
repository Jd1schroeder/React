alter table public.work_order_inbox_preferences
  add column if not exists updated_by uuid references auth.users(id) on delete set null;
