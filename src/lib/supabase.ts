import { createClient } from "@supabase/supabase-js";

// These are read from .env (Vite). After connecting Supabase, add to a .env file:
// VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
// VITE_SUPABASE_ANON_KEY=eyJhbGciOi... (anon/publishable key — safe to expose)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  SUPABASE_URL !== "YOUR_SECRET_VALUE_GOES_HERE" &&
  SUPABASE_URL.startsWith("http")
);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Zerra] Supabase env vars missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env",
  );
}

export const supabase = createClient(
  SUPABASE_URL ?? "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY ?? "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: localStorage,
    },
  },
);

// ==== DB row types (must match the SQL schema below) ====
export interface ProfileRow {
  id: string;
  name: string;
  phone: string | null;
  role: "Student" | "Provider" | "NGO";
  created_at: string;
}

export interface FoodRow {
  id: string;
  user_id: string;
  name: string;
  image: string | null;
  feeds: number;
  price: number;
  expiry_hours: number;
  prepared_at: string;
  address: string;
  lat: number;
  lng: number;
  category: "Veg" | "Non-Veg" | "Bakery" | "Fried" | "Sweets";
  tags: string[];
  purpose: "humans" | "animals" | "both";
  safe_for_animals: boolean;
  status: "available" | "reserved" | "collected";
  realtime_status: "Still Available" | "Almost Gone" | "Not Available";
  quantity: string;
  notes: string | null;
  allow_split: boolean;
  created_at: string;
}
