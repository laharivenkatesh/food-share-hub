import { useCallback, useEffect, useState } from "react";
import { FoodItem } from "@/types/food";
import { useAuth } from "./useAuth";

const KEY = (userId: string) => `zerra:posts:${userId}`;

export function useMyPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FoodItem[]>([]);

  useEffect(() => {
    if (!user) {
      setPosts([]);
      return;
    }
    try {
      setPosts(JSON.parse(localStorage.getItem(KEY(user.id)) || "[]"));
    } catch {
      setPosts([]);
    }
  }, [user]);

  const addPost = useCallback(
    (food: FoodItem) => {
      if (!user) return;
      const next = [food, ...posts];
      setPosts(next);
      localStorage.setItem(KEY(user.id), JSON.stringify(next));
    },
    [posts, user],
  );

  const removePost = useCallback(
    (id: string) => {
      if (!user) return;
      const next = posts.filter((p) => p.id !== id);
      setPosts(next);
      localStorage.setItem(KEY(user.id), JSON.stringify(next));
    },
    [posts, user],
  );

  return { posts, addPost, removePost };
}

// Read-only helper for combining with mock data on Home/Detail pages
export function readAllUserPosts(): FoodItem[] {
  const out: FoodItem[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("zerra:posts:")) {
      try {
        out.push(...JSON.parse(localStorage.getItem(k) || "[]"));
      } catch {
        // skip
      }
    }
  }
  return out;
}
