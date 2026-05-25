import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface DbNotification {
  id: string;
  user_id: string;
  food_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextValue {
  notifications: DbNotification[];
  loading: boolean;
  unreadCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// Synthesize a beautiful double-tone chime using Web Audio API
export const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      
      gainNode.gain.setValueAtTime(0.08, startTime); // Subtle volume
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = audioCtx.currentTime;
    playTone(523.25, now, 0.35); // C5
    playTone(659.25, now + 0.08, 0.45); // E5
  } catch (e) {
    console.warn("Web Audio API is not supported or was blocked by the browser", e);
  }
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("zerra-notification-sound");
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem("zerra-notification-sound", String(enabled));
    } catch {}
  }, []);

  const refresh = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
      } else {
        setNotifications(data || []);
      }
    } catch (err) {
      console.error("Exception fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Handle initialization and real-time subscription
  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    refresh();

    // Subscribe to realtime changes on notifications table for current user
    const channel = supabase
      .channel(`notifications-user-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as DbNotification;
          
          // Add to local state
          setNotifications((prev) => [newNotif, ...prev]);

          // Play sound chime if enabled
          if (soundEnabled) {
            playNotificationSound();
          }

          // Show interactive toast popup
          toast("🍱 " + newNotif.title, {
            description: newNotif.message,
            duration: 6000,
            action: {
              label: "View",
              onClick: () => {
                // Navigate will be handled in UI or using window.location for global hook
                window.location.hash = `#/food/${newNotif.food_id}`;
                // Fallback direct path
                window.dispatchEvent(new CustomEvent("view-food-notification", { detail: newNotif }));
              },
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh, soundEnabled]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic local state update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    if (!isSupabaseConfigured) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) {
        console.error("Error marking notification as read:", error);
        // Rollback on error
        refresh();
      }
    } catch (err) {
      console.error("Exception marking notification as read:", err);
    }
  }, [refresh]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    if (!isSupabaseConfigured) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Error marking all as read:", error);
        refresh();
      }
    } catch (err) {
      console.error("Exception marking all as read:", err);
    }
  }, [user, refresh]);

  const deleteNotification = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    if (!isSupabaseConfigured) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting notification:", error);
        refresh();
      }
    } catch (err) {
      console.error("Exception deleting notification:", err);
    }
  }, [refresh]);

  const clearAll = useCallback(async () => {
    if (!user) return;

    setNotifications([]);

    if (!isSupabaseConfigured) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        console.error("Error clearing notifications:", error);
        refresh();
      }
    } catch (err) {
      console.error("Exception clearing notifications:", err);
    }
  }, [user, refresh]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        loading,
        unreadCount,
        soundEnabled,
        setSoundEnabled,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        refresh,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside <NotificationProvider>");
  return ctx;
}
