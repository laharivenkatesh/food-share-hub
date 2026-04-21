import { useCallback, useEffect, useState } from "react";
import { FoodItem } from "@/types/food";
import { useAuth } from "./useAuth";
import { supabase } from "@/lib/supabase";

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
      .from('foods')
      .select('*, profiles:user_id(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const formattedPosts: FoodItem[] = (data || []).map(row => ({
      id: row.id,
      name: row.name,
      image: row.image || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80",
      feeds: row.feeds,
      price: row.price,
      expiryHours: row.expiry_hours,
      preparedAt: row.prepared_at,
      address: row.address,
      lat: row.lat,
      lng: row.lng,
      category: row.category,
      tags: row.tags,
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
        id: row.profiles.id,
        name: row.profiles.name,
        trustScore: 4.5,
        badges: ["Community Member"],
        streak: 1,
        reliability: "high",
        avatar: "🧑",
      }
    }));
    
    setPosts(formattedPosts);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addPost = useCallback(
    async (input: any) => {
      if (!user) return { ok: false as const, error: "Not authenticated" };
      
      const { data, error } = await supabase.from('foods').insert({
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
      }).select('*, profiles:user_id(*)').single();

      if (error) {
        console.error(error);
        return { ok: false as const, error: error.message };
      }

      const newFood: FoodItem = {
        id: data.id,
        name: data.name,
        image: data.image || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80",
        feeds: data.feeds,
        price: data.price,
        expiryHours: data.expiry_hours,
        preparedAt: data.prepared_at,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        category: data.category,
        tags: data.tags,
        purpose: data.purpose,
        safeForAnimals: data.safe_for_animals,
        status: data.status,
        realtimeStatus: data.realtime_status,
        quantity: data.quantity,
        notes: data.notes,
        allowSplit: data.allow_split,
        postedAt: data.created_at,
        trustScore: 4.5,
        confidence: "High",
        reviews: [],
        provider: {
          id: data.profiles.id,
          name: data.profiles.name,
          trustScore: 4.5,
          badges: ["Community Member"],
          streak: 1,
          reliability: "high",
          avatar: "🧑",
        }
      };

      setPosts(prev => [newFood, ...prev]);
      return { ok: true as const, data: newFood };
    },
    [user],
  );

  const removePost = useCallback(
    async (id: string) => {
      await supabase.from('foods').delete().eq('id', id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    },
    [],
  );

  const getLastPostTime = useCallback(() => {
    if (posts.length === 0) return 0;
    const sorted = [...posts].sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    return new Date(sorted[0].postedAt).getTime();
  }, [posts]);

  return { posts, loading, addPost, removePost, refresh, getLastPostTime };
}

export function useAllFoods() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const { data, error } = await supabase
        .from('foods')
        .select('*, profiles:user_id(*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const formattedPosts: FoodItem[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        image: row.image || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80",
        feeds: row.feeds,
        price: row.price,
        expiryHours: row.expiry_hours,
        preparedAt: row.prepared_at,
        address: row.address,
        lat: row.lat,
        lng: row.lng,
        category: row.category,
        tags: row.tags,
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
          id: row.profiles?.id || 'unknown',
          name: row.profiles?.name || 'Unknown User',
          trustScore: 4.5,
          badges: ["Community Member"],
          streak: 1,
          reliability: "high",
          avatar: "🧑",
        }
      }));
      setFoods(formattedPosts);
      setLoading(false);
    };

    fetchAll();
  }, []);

  return { foods, loading };
}
