-- ============================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO FIX THE ERRORS
-- ============================================================

-- 1) FIX THE FOREIGN KEY ERROR (HTTP 400)
-- This drops the old constraint pointing to auth.users and points it to public.profiles
alter table public.foods drop constraint if exists foods_user_id_fkey;
alter table public.foods drop constraint if exists foods_user_id_profiles_fkey;
alter table public.foods add constraint foods_user_id_profiles_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

-- 2) CREATE THE MISSING TRANSACTIONS TABLE (HTTP 404)
-- We check if the enum exists first to prevent errors
do $$
begin
  if not exists (select 1 from pg_type where typname = 'transaction_status') then
    create type public.transaction_status as enum ('pending', 'accepted', 'completed', 'cancelled');
  end if;
end
$$;

create table if not exists public.transactions (
  id                 uuid primary key default gen_random_uuid(),
  food_id            uuid not null references public.foods(id) on delete cascade,
  donor_id           uuid not null references auth.users(id) on delete cascade,
  collector_id       uuid not null references auth.users(id) on delete cascade,
  status             public.transaction_status not null default 'pending',
  donor_accepted     boolean not null default false,
  collector_accepted boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.transactions enable row level security;

-- Drop policies if they exist so this script can be run multiple times safely
drop policy if exists "Transactions: viewable by participants" on public.transactions;
drop policy if exists "Transactions: insert by collector" on public.transactions;
drop policy if exists "Transactions: update by participants" on public.transactions;

create policy "Transactions: viewable by participants"
  on public.transactions for select using (auth.uid() = donor_id or auth.uid() = collector_id);

create policy "Transactions: insert by collector"
  on public.transactions for insert with check (auth.uid() = collector_id);

create policy "Transactions: update by participants"
  on public.transactions for update using (auth.uid() = donor_id or auth.uid() = collector_id);
