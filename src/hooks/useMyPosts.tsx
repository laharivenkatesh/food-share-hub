import { useCallback, useEffect, useState } from "react";
import { FoodItem } from "@/types/food";
import { supabase, FoodRow } from "@/lib/supabase";
import { useAuth } from "./useAuth";

const rowToFood = (r: FoodRow, providerName = "You"): FoodItem => ({
  id: r.id,
  name: r.name,
  image: r.image || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80",
  feeds: r.feeds,
  price: Number(r.price),
  expiryHours: Number(r.expiry_hours),
  preparedAt: r.prepared_at,
  address: r.address,
  lat: r.lat,
  lng: r.lng,
  category: r.category,
  tags: r.tags ?? [],
  purpose: r.purpose,
  safeForAnimals: r.safe_for_animals,
  status: r.status,
  realtimeStatus: r.realtime_status,
  trustScore: 4.5,
  confidence: "High",
  quantity: r.quantity,
  notes: r.notes ?? undefined,
  allowSplit: r.allow_split,
  provider: {
    id: r.user_id,
    name: providerName,
    trustScore: 4.5,
    badges: ["Community Member"],
    streak: 1,
    reliability: "high",
    avatar: "🧑",
  },
  reviews: [],
  postedAt: new Date(r.created_at).toLocaleString(),
});

export function useMyPosts() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setPosts([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("foods")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setPosts((data as FoodRow[]).map((r) => rowToFood(r, profile?.name ?? "You")));
    }
    setLoading(false);
  }, [user, profile?.name]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addPost = useCallback(
    async (input: Omit<FoodRow, "id" | "user_id" | "created_at">) => {
      if (!user) return { ok: false as const, error: "Not authenticated" };
      const { data, error } = await supabase
        .from("foods")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) return { ok: false as const, error: error.message };
      setPosts((prev) => [rowToFood(data as FoodRow, profile?.name ?? "You"), ...prev]);
      return { ok: true as const, data };
    },
    [user, profile?.name],
  );

  const removePost = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("foods").delete().eq("id", id);
      if (!error) setPosts((prev) => prev.filter((p) => p.id !== id));
    },
    [],
  );

  return { posts, loading, addPost, removePost, refresh };
}

export function useAllFoods() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("foods")
        .select("*, profiles(name)")
        .order("created_at", { ascending: false });
      if (!cancelled) {
        if (!error && data) {
          setFoods(
            (data as (FoodRow & { profiles: { name: string } | null })[]).map((r) =>
              rowToFood(r, r.profiles?.name ?? "Community Member"),
            ),
          );
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { foods, loading };
}
