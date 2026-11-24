-- Gym Diary: private per-user storage.
-- Run this in Supabase SQL Editor before enabling app sync.

create table if not exists public.gym_diary_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.gym_diary_data enable row level security;

-- Each signed-in user can access only their own diary row.
drop policy if exists "Users can read own diary" on public.gym_diary_data;
create policy "Users can read own diary"
  on public.gym_diary_data for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own diary" on public.gym_diary_data;
create policy "Users can insert own diary"
  on public.gym_diary_data for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own diary" on public.gym_diary_data;
create policy "Users can update own diary"
  on public.gym_diary_data for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No delete policy: the browser app does not need to delete account data.
