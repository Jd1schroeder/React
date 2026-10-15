-- The custom-field-aware RPC supersedes the legacy 12-argument overload.
-- Keeping both overloads makes PostgreSQL unable to choose a function when
-- defaulted parameters are involved.
drop function if exists public.create_work_order_with_assignments(
  uuid,
  uuid,
  text,
  text,
  text,
  date,
  time,
  date,
  integer,
  text,
  jsonb,
  jsonb
);

notify pgrst, 'reload schema';
