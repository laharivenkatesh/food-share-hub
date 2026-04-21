-- ============================================================
-- Zerra — Supabase Schema
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1) ENUMS ---------------------------------------------------
create type public.app_role as enum ('Student', 'Provider', 'NGO');
create type public.food_category as enum ('Veg', 'Non-Veg', 'Bakery', 'Fried', 'Sweets');
create type public.food_purpose  as enum ('humans', 'animals', 'both');
create type public.food_status   as enum ('available', 'reserved', 'collected');
create type public.realtime_status as enum ('Still Available', 'Almost Gone', 'Not Available');

-- 2) PROFILES ------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  phone       text,
  role        public.app_role not null default 'Student',
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles: viewable by everyone"
  on public.profiles for select using (true);

create policy "Profiles: insert own"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Profiles: update own"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create a profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'Student')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) FOODS ---------------------------------------------------
create table public.foods (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  image            text,
  feeds            int  not null default 1,
  price            numeric not null default 0,
  expiry_hours     numeric not null default 4,
  prepared_at      text not null,
  address          text not null,
  lat              double precision not null,
  lng              double precision not null,
  category         public.food_category not null default 'Veg',
  tags             text[] not null default '{}',
  purpose          public.food_purpose not null default 'humans',
  safe_for_animals boolean not null default false,
  status           public.food_status not null default 'available',
  realtime_status  public.realtime_status not null default 'Still Available',
  quantity         text not null,
  notes            text,
  allow_split      boolean not null default true,
  created_at       timestamptz not null default now()
);

create index foods_user_id_idx on public.foods(user_id);
create index foods_created_at_idx on public.foods(created_at desc);

alter table public.foods enable row level security;

create policy "Foods: viewable by everyone"
  on public.foods for select using (true);

create policy "Foods: insert own"
  on public.foods for insert with check (auth.uid() = user_id);

create policy "Foods: update own"
  on public.foods for update using (auth.uid() = user_id);

create policy "Foods: delete own"
  on public.foods for delete using (auth.uid() = user_id);
