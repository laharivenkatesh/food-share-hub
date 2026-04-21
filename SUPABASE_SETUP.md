# Zerra — Supabase Setup

## 1. Create your free Supabase project
1. Go to https://supabase.com → New project
2. Copy your **Project URL** and **anon/public key** (Project Settings → API)

## 2. Add credentials to your app
Create a `.env` file in the project root (already gitignored by Vite):

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
```

Restart the dev server after editing `.env`.

## 3. Run the schema
Open Supabase Dashboard → **SQL Editor** → New query → paste the contents of
[`supabase_schema.sql`](./supabase_schema.sql) → Run.

This creates:
- `profiles` table (auto-populated on signup via trigger)
- `foods` table (your posted leftovers)
- Row Level Security: anyone can read, only owners can insert/update/delete

## 4. (Optional) Disable email confirmation for faster testing
Supabase Dashboard → Authentication → Providers → Email → toggle off **"Confirm email"**.

## 5. You're done
- Sign up at `/auth` → row auto-created in `profiles`
- Post food at `/post` → row inserted in `foods` (with your `user_id`)
- Activity tab `/activity` → shows YOUR posts forever, across devices
