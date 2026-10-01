create table if not exists public.work_order_inbox_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sort_id text not null default 'priority-highest',
  unread_first boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, organization_id),
  constraint work_order_inbox_preferences_sort_id_check
    check (sort_id in ('created-oldest', 'created-newest', 'due-earliest', 'due-latest', 'updated-oldest', 'updated-newest', 'priority-highest', 'priority-lowest'))
);

alter table public.work_order_inbox_preferences enable row level security;

drop policy if exists "Members can view their Work Order Inbox preferences" on public.work_order_inbox_preferences;
create policy "Members can view their Work Order Inbox preferences"
  on public.work_order_inbox_preferences for select to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.organization_members members
      where members.organization_id = work_order_inbox_preferences.organization_id
        and members.user_id = auth.uid()
        and members.status = 'active'
    )
  );

drop policy if exists "Members can insert their Work Order Inbox preferences" on public.work_order_inbox_preferences;
create policy "Members can insert their Work Order Inbox preferences"
  on public.work_order_inbox_preferences for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.organization_members members
      where members.organization_id = work_order_inbox_preferences.organization_id
        and members.user_id = auth.uid()
        and members.status = 'active'
    )
  );

drop policy if exists "Members can update their Work Order Inbox preferences" on public.work_order_inbox_preferences;
create policy "Members can update their Work Order Inbox preferences"
  on public.work_order_inbox_preferences for update to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.organization_members members
      where members.organization_id = work_order_inbox_preferences.organization_id
        and members.user_id = auth.uid()
        and members.status = 'active'
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.organization_members members
      where members.organization_id = work_order_inbox_preferences.organization_id
        and members.user_id = auth.uid()
        and members.status = 'active'
    )
  );

drop policy if exists "Members can delete their Work Order Inbox preferences" on public.work_order_inbox_preferences;
create policy "Members can delete their Work Order Inbox preferences"
  on public.work_order_inbox_preferences for delete to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.organization_members members
      where members.organization_id = work_order_inbox_preferences.organization_id
        and members.user_id = auth.uid()
        and members.status = 'active'
    )
  );

drop trigger if exists work_order_inbox_preferences_set_updated_at on public.work_order_inbox_preferences;
create trigger work_order_inbox_preferences_set_updated_at
before update on public.work_order_inbox_preferences
for each row execute function public.set_updated_at();
