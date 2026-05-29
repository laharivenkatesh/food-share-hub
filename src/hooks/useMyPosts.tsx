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
    bookedPortions: row.booked_portions || 0,
    trustScore: 4.5,
    confidence: "High",
    reviews: (row.reviews || []).map((r: any) => ({
      id: r.id,
      user: r.user_name || "Anonymous",
      rating: r.rating,
      comment: r.comment,
      date: new Date(r.created_at).toLocaleDateString(),
    })),
    provider: {
      id: row.profiles?.id || row.user_id,
      name: row.profiles?.name || "Unknown User",
      trustScore: 4.5,
      badges: ["Community Member"],
      streak: 1,
      reliability: "high",
      avatar: "🧑",
      email: row.profiles?.email || "",
      phone: row.profiles?.phone || "",
    },
  };
}

let globalMyPostsCache: FoodItem[] = [];
let globalMyPostsLoaded = false;

export function useMyPosts() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<FoodItem[]>(globalMyPostsCache);
  const [loading, setLoading] = useState(!globalMyPostsLoaded);

  const refresh = useCallback(async (isBackground = false) => {
    if (!user) {
      setPosts([]);
      globalMyPostsCache = [];
      globalMyPostsLoaded = false;
      return;
    }
    try {
      if (!isBackground && !globalMyPostsLoaded) setLoading(true);

      const { data, error } = await supabase
        .from("foods")
        .select("*, profiles!foods_user_id_profiles_fkey(*), reviews(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("useMyPosts fetch error:", error);
        return;
      }

      const mapped = (data || []).map(mapRow);
      globalMyPostsCache = mapped;
      globalMyPostsLoaded = true;
      setPosts(mapped);
    } catch (err) {
      console.error("Exception in useMyPosts refresh:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    refresh();

    if (!user) return;

    const channelId = `my-posts-realtime-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "foods", filter: `user_id=eq.${user.id}` },
        () => {
          refresh(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, authLoading, user]);

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
      globalMyPostsCache = [newFood, ...globalMyPostsCache];
      setPosts((prev) => [newFood, ...prev]);
      return { ok: true as const, data: newFood };
    },
    [user]
  );

  const removePost = useCallback(async (id: string) => {
    await supabase.from("foods").delete().eq("id", id);
    globalMyPostsCache = globalMyPostsCache.filter((p) => p.id !== id);
    globalFoodsCache = globalFoodsCache.filter((p) => p.id !== id);
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

let globalFoodsCache: FoodItem[] = [];
let globalFoodsLoaded = false;

export function useAllFoods() {
  const { loading: authLoading } = useAuth();
  const [foods, setFoods] = useState<FoodItem[]>(globalFoodsCache);
  const [loading, setLoading] = useState(!globalFoodsLoaded);

  const refresh = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground && !globalFoodsLoaded) setLoading(true);
      const { data, error } = await supabase
        .from("foods")
        .select("*, profiles!foods_user_id_profiles_fkey(*), reviews(*)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("useAllFoods fetch error:", error);
        return;
      }

      const mapped = (data || []).map(mapRow);
      globalFoodsCache = mapped;
      globalFoodsLoaded = true;
      setFoods(mapped);
    } catch (err) {
      console.error("Exception in useAllFoods refresh:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    refresh();

    const channelId = `foods-realtime-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "foods" },
        () => {
          refresh(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, authLoading]);

  return { foods, loading, refresh };
}