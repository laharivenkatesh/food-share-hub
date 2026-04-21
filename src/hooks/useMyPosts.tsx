import { useCallback, useEffect, useState } from "react";
import { FoodItem } from "@/types/food";
import { useAuth, MockProfile } from "./useAuth";
import { mockFoods } from "@/data/mockFoods";

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
    const stored = localStorage.getItem("zerra_foods") || "[]";
    let allFoods: FoodItem[] = JSON.parse(stored);
    
    // Filter out old static mockFoods (which have IDs like 'f1' instead of 'f_...')
    allFoods = allFoods.filter((f) => f.id.includes("_"));
    if (!localStorage.getItem("zerra_foods")) {
      localStorage.setItem("zerra_foods", stored);
    }

    const myPosts = allFoods.filter(f => f.provider.id === user.id).sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    setPosts(myPosts);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addPost = useCallback(
    async (input: any) => {
      if (!user) return { ok: false as const, error: "Not authenticated" };
      
      const stored = localStorage.getItem("zerra_foods") || "[]";
      let allFoods: FoodItem[] = JSON.parse(stored);
      allFoods = allFoods.filter((f) => f.id.includes("_"));

      const newFood: FoodItem = {
        id: "f_" + Math.random().toString(36).substring(2, 9),
        name: input.name,
        image: input.image || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80",
        feeds: input.feeds,
        price: input.price,
        expiryHours: input.expiry_hours,
        preparedAt: input.prepared_at,
        address: input.address,
        lat: input.lat,
        lng: input.lng,
        category: input.category,
        tags: input.tags,
        purpose: input.purpose,
        safeForAnimals: input.safe_for_animals,
        status: input.status,
        realtimeStatus: input.realtime_status,
        trustScore: 4.5,
        confidence: "High",
        quantity: input.quantity,
        notes: input.notes,
        allowSplit: input.allow_split,
        provider: {
          id: user.id,
          name: profile?.name ?? "You",
          trustScore: 4.5,
          badges: ["Community Member"],
          streak: 1,
          reliability: "high",
          avatar: "🧑",
        },
        reviews: [],
        postedAt: new Date().toISOString(),
      };

      const updatedFoods = [newFood, ...allFoods];
      localStorage.setItem("zerra_foods", JSON.stringify(updatedFoods));
      setPosts(prev => [newFood, ...prev]);
      
      return { ok: true as const, data: newFood };
    },
    [user, profile?.name],
  );

  const removePost = useCallback(
    async (id: string) => {
      const stored = localStorage.getItem("zerra_foods") || "[]";
      let allFoods: FoodItem[] = JSON.parse(stored);
      allFoods = allFoods.filter(f => f.id !== id);
      localStorage.setItem("zerra_foods", JSON.stringify(allFoods));
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
    const stored = localStorage.getItem("zerra_foods") || "[]";
    let allFoods: FoodItem[] = JSON.parse(stored);
    
    // Filter out old static mockFoods
    allFoods = allFoods.filter((f) => f.id.includes("_"));
    
    // Sort by created at desc
    allFoods.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    
    setFoods(allFoods);
    setLoading(false);
  }, []);

  return { foods, loading };
}
