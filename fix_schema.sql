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

-- ============================================================
-- 3) CREATE THE NOTIFICATIONS TABLE
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Drop policies if they exist so this script can be run multiple times safely
drop policy if exists "Users can view their own notifications" on public.notifications;
drop policy if exists "Users can update their own notifications" on public.notifications;
drop policy if exists "Users can delete their own notifications" on public.notifications;

create policy "Users can view their own notifications"
  on public.notifications for select using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update using (auth.uid() = user_id);

create policy "Users can delete their own notifications"
  on public.notifications for delete using (auth.uid() = user_id);

-- ============================================================
-- 4) CREATE THE TRIGGER FUNCTION FOR FOOD NOTIFICATIONS
-- ============================================================
create or replace function public.notify_all_users_on_new_food()
returns trigger as $$
begin
  -- Trigger only when food becomes "available" (on creation or status change)
  if (tg_op = 'INSERT' and new.status = 'available') or 
     (tg_op = 'UPDATE' and new.status = 'available' and old.status <> 'available') then
     
    insert into public.notifications (user_id, food_id, title, message)
    select 
      p.id, 
      new.id, 
      '🍱 New Food Available!', 
      new.name || ' is available for pickup at ' || new.address || '. Grab it before it expires!'
    from public.profiles p
    where p.id <> new.user_id;
    
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Create the trigger
drop trigger if exists on_new_food_posted on public.foods;
create trigger on_new_food_posted
  after insert or update on public.foods
  for each row
  execute function public.notify_all_users_on_new_food();

