import { useCallback, useEffect, useState } from "react";
import { FoodItem } from "@/types/food";
import { useAuth } from "./useAuth";
import { supabase } from "@/lib/supabase";

function resolveImageUrl(image: string | null | undefined): string {
  const fallback = "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80";
  if (!image) return fallback;
  if (image.startsWith("http") || image.startsWith("data:")) return image;
  const { data } = supabase.storage.from("food-images").getPublicUrl(image);
  return data?.publicUrl || fallback;
}

function mapRow(row: any): FoodItem {
  return {
    id: row.id,
    name: row.name,
    image: resolveImageUrl(row.image),
    feeds: row.feeds,
    price: row.price,
    expiryHours: row.expiry_hours,
    preparedAt: row.prepared_at,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    category: row.category,
    tags: row.tags || [],
    purpose: row.purpose,
    safeForAnimals: row.safe_for_animals,
    status: row.status,
    realtimeStatus: row.realtime_status,
    quantity: row.quantity,
    notes: row.notes,
    allowSplit: row.allow_split,
    postedAt: row.created_at,
    trustScore: 4.5,
    confidence: "High",
    reviews: [],
    provider: {
      id: row.profiles?.id || row.user_id,
      name: row.profiles?.name || "Unknown User",
      trustScore: 4.5,
      badges: ["Community Member"],
      streak: 1,
      reliability: "high",
      avatar: "🧑",
    },
  };
}

export function useMyPosts() {
  const { user } = useAuth();
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
      .select("*, profiles!foods_user_id_profiles_fkey(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("useMyPosts fetch error:", error);
      setLoading(false);
      return;
    }

    setPosts((data || []).map(mapRow));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addPost = useCallback(
    async (input: any) => {
      if (!user) return { ok: false as const, error: "Not authenticated" };

      const { data, error } = await supabase
        .from("foods")
        .insert({
          user_id: user.id,
          name: input.name,
          image: input.image,
          feeds: input.feeds,
          price: input.price,
          expiry_hours: input.expiry_hours,
          prepared_at: input.prepared_at,
          address: input.address,
          lat: input.lat,
          lng: input.lng,
          category: input.category,
          tags: input.tags,
          purpose: input.purpose,
          safe_for_animals: input.safe_for_animals,
          status: input.status,
          realtime_status: input.realtime_status,
          quantity: input.quantity,
          notes: input.notes,
          allow_split: input.allow_split,
        })
        .select("*, profiles!foods_user_id_profiles_fkey(*)")
        .single();

      if (error) {
        console.error("addPost error:", error);
        return { ok: false as const, error: error.message };
      }

      const newFood = mapRow(data);
      setPosts((prev) => [newFood, ...prev]);
      return { ok: true as const, data: newFood };
    },
    [user]
  );

  const removePost = useCallback(async (id: string) => {
    await supabase.from("foods").delete().eq("id", id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getLastPostTime = useCallback(() => {
    if (posts.length === 0) return 0;
    const sorted = [...posts].sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
    );
    return new Date(sorted[0].postedAt).getTime();
  }, [posts]);

  return { posts, loading, addPost, removePost, refresh, getLastPostTime };
}

export function useAllFoods() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("foods")
      .select("*, profiles!foods_user_id_profiles_fkey(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("useAllFoods fetch error:", error);
      setLoading(false);
      return;
    }

    setFoods((data || []).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel("foods-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "foods" },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { foods, loading, refresh };
}