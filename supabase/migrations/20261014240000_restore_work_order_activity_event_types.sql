-- Preserve activity events for all Work Order features when external completion
-- support updates the shared event-type constraint.

alter table public.work_order_activity
  drop constraint if exists work_order_activity_event_type_check;

alter table public.work_order_activity
  add constraint work_order_activity_event_type_check
  check (event_type in (
    'work_order_created',
    'work_order_updated',
    'status_changed',
    'work_order_time_added',
    'work_order_time_updated',
    'work_order_time_deleted',
    'work_order_cost_added',
    'work_order_cost_updated',
    'work_order_cost_deleted',
    'external_completion_requested'
  ));

