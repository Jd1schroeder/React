alter table public.user_preferences
  add column notification_settings jsonb not null default '{}'::jsonb;

alter table public.user_preferences
  add constraint user_preferences_notification_settings_object_check
  check (jsonb_typeof(notification_settings) = 'object');
