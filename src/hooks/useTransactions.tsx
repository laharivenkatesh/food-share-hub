import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export type TransactionStatus = "pending" | "accepted" | "completed" | "cancelled";

export interface Transaction {
  id: string;
  food_id: string;
  donor_id: string;
  collector_id: string;
  status: TransactionStatus;
  portions: number;
  donor_accepted: boolean;
  collector_accepted: boolean;
  collector_lat?: number | null;
  collector_lng?: number | null;
  created_at: string;
  updated_at: string;
  food?: any;
  foods?: any;
}

export interface UserStats {
  mealsCollected: number;
  animalsFed: number;
  postsMade: number;
  pickupSuccess: number;
  badges: { icon: string; text: string }[];
}

interface TransactionContextValue {
  transactions: Transaction[];
  userStats: UserStats;
  loading: boolean;
  requestFood: (foodId: string, donorId: string, portions: number, collectorLat?: number, collectorLng?: number) => Promise<void>;
  markCollected: (transactionId: string) => Promise<void>;
  markDonated: (transactionId: string) => Promise<void>;
  getTransactionForFood: (foodId: string) => Transaction | undefined;
  refreshTransactions: () => Promise<void>;
}

const TransactionContext = createContext<TransactionContextValue | null>(null);

let globalTransactionsCache: Transaction[] = [];
let globalTransactionsLoaded = false;

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>(globalTransactionsCache);
  const [userStats, setUserStats] = useState<UserStats>({
    mealsCollected: 0,
    animalsFed: 0,
    postsMade: 0,
    pickupSuccess: 0,
    badges: []
  });
  const [loading, setLoading] = useState(!globalTransactionsLoaded);

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      globalTransactionsCache = [];
      globalTransactionsLoaded = false;
      setLoading(false);
      return;
    }

    try {
      if (!globalTransactionsLoaded) setLoading(true);
      const { data, error } = await supabase
        .from("transactions")
        .select("*, food:foods(*)")
        .or(`donor_id.eq.${user.id},collector_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching transactions:", error);
      } else {
        const txs = data || [];
        globalTransactionsCache = txs;
        globalTransactionsLoaded = true;
        setTransactions(txs);
      }
    } catch (err) {
      console.error("Exception fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const computeStats = useCallback(async () => {
    if (!user) return;

    const { data: completedTxs } = await supabase
      .from("transactions")
      .select("*")
      .eq("status", "completed")
      .or(`donor_id.eq.${user.id},collector_id.eq.${user.id}`);

    const completed = completedTxs || [];

    const mealsCollected = completed.filter(t => t.collector_id === user.id).length * 5;
    const postsMade = completed.filter(t => t.donor_id === user.id).length;

    const { data: allTxs } = await supabase
      .from("transactions")
      .select("*")
      .or(`donor_id.eq.${user.id},collector_id.eq.${user.id}`);

    const total = allTxs?.length || 0;
    const pickupSuccess = total === 0 ? 0 : Math.round((completed.length / total) * 100);

    const badges: { icon: string; text: string }[] = [];
    if (postsMade > 0) badges.push({ icon: "🪴", text: "Consistent Provider" });
    if (mealsCollected > 0) badges.push({ icon: "💛", text: "Regular Helper" });
    if (pickupSuccess >= 90 && completed.length > 0) badges.push({ icon: "🏆", text: "Top Contributor" });
    if (mealsCollected > 10) badges.push({ icon: "⚡", text: "Quick Rescuer" });

    setUserStats({
      mealsCollected,
      animalsFed: 0,
      postsMade,
      pickupSuccess,
      badges
    });
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    fetchTransactions();

    const channelId = `transactions-realtime-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTransactions, authLoading]);

  useEffect(() => {
    computeStats();
  }, [transactions, computeStats]);

  // Global Geolocation tracking for active collector transactions
  const activeCollectorTxs = transactions.filter(
    t => {
      if (t.collector_id !== user?.id) return false;
      if (t.status === "completed" || t.status === "cancelled") return false;
      if (t.collector_accepted) return false;
      const f = t.food || t.foods;
      if (f) {
        if (f.status === "collected") return false;
        if (f.realtime_status === "Not Available") return false;
      }
      return t.status === "pending" || t.status === "accepted";
    }
  );

  const activeCollectorTxsRef = useRef(activeCollectorTxs);
  useEffect(() => {
    activeCollectorTxsRef.current = activeCollectorTxs;
  }, [activeCollectorTxs]);

  useEffect(() => {
    if (!user || activeCollectorTxs.length === 0) return;
    if (!("geolocation" in navigator)) return;

    const updateLocation = async (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      const currentTxs = activeCollectorTxsRef.current;
      for (const tx of currentTxs) {
        // Compare with a tiny threshold to prevent redundant writes
        const latDiff = Math.abs((tx.collector_lat || 0) - latitude);
        const lngDiff = Math.abs((tx.collector_lng || 0) - longitude);
        if (latDiff > 0.00001 || lngDiff > 0.00001) {
          await supabase
            .from("transactions")
            .update({
              collector_lat: latitude,
              collector_lng: longitude,
              updated_at: new Date().toISOString()
            })
            .eq("id", tx.id);
        }
      }
    };

    // 1. Register watchPosition
    const watchId = navigator.geolocation.watchPosition(
      (pos) => updateLocation(pos),
      (err) => console.warn("Global live location watch error:", err),
      { enableHighAccuracy: false, timeout: 15000 }
    );

    // 2. Backup polling interval (every 10 seconds)
    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => updateLocation(pos),
        (err) => console.warn("Backup getCurrentPosition error:", err),
        { enableHighAccuracy: false, timeout: 10000 }
      );
    }, 10000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(intervalId);
    };
  }, [user, activeCollectorTxs.length > 0]);

  const requestFood = async (
    foodId: string,
    donorId: string,
    portions: number = 1,
    collectorLat?: number,
    collectorLng?: number
  ) => {
    if (!user) return;

    // 1. Fetch current food feeds and booked portions
    const { data: food } = await supabase
      .from("foods")
      .select("feeds, booked_portions")
      .eq("id", foodId)
      .single();

    const currentBooked = (food?.booked_portions || 0) + portions;
    const isFullyBookedNow = food ? currentBooked >= food.feeds : false;

    // 2. Insert transaction
    const { error } = await supabase.from("transactions").insert({
      food_id: foodId,
      donor_id: donorId,
      collector_id: user.id,
      status: "pending",
      donor_accepted: false,
      collector_accepted: false,
      portions: portions,
      collector_lat: collectorLat,
      collector_lng: collectorLng
    });

    if (error) {
      console.error("Error requesting food:", error);
    } else {
      // 3. If fully booked, update status/realtime_status on foods table
      if (isFullyBookedNow) {
        await supabase
          .from("foods")
          .update({ 
            realtime_status: "Not Available", 
            status: "reserved",
            booked_portions: currentBooked 
          })
          .eq("id", foodId);
      } else {
        await supabase
          .from("foods")
          .update({
            booked_portions: currentBooked
          })
          .eq("id", foodId);
      }
      await fetchTransactions();
    }
  };

  const syncFoodStatusOnCompletion = async (foodId: string) => {
    // Get food feeds capacity
    const { data: food } = await supabase
      .from("foods")
      .select("feeds")
      .eq("id", foodId)
      .single();

    if (!food) return;

    // Sum all completed transaction portions
    const { data: txs } = await supabase
      .from("transactions")
      .select("portions")
      .eq("food_id", foodId)
      .eq("status", "completed");

    const completedPortions = (txs || []).reduce((sum, t) => sum + (t.portions || 0), 0);

    if (completedPortions >= food.feeds) {
      await supabase
        .from("foods")
        .update({
          status: "collected",
          realtime_status: "Not Available"
        })
        .eq("id", foodId);
    }
  };

  const markCollected = async (transactionId: string) => {
    const { data: tx } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (!tx) return;

    const { error } = await supabase
      .from("transactions")
      .update({
        collector_accepted: true,
        status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", transactionId);

    if (!error) {
      await syncFoodStatusOnCompletion(tx.food_id);
      // Delete notification for collector immediately
      try {
        await supabase
          .from("notifications")
          .delete()
          .eq("food_id", tx.food_id)
          .eq("user_id", tx.collector_id);
      } catch (err) {
        console.error("Error deleting notification after collection:", err);
      }
      await fetchTransactions();
    }
  };

  const markDonated = async (transactionId: string) => {
    const { data: tx } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (!tx) return;

    const { error } = await supabase
      .from("transactions")
      .update({
        donor_accepted: true,
        status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", transactionId);

    if (!error) {
      await syncFoodStatusOnCompletion(tx.food_id);
      // Delete notification for donor immediately
      try {
        await supabase
          .from("notifications")
          .delete()
          .eq("food_id", tx.food_id)
          .eq("user_id", tx.donor_id);
      } catch (err) {
        console.error("Error deleting notification after donation:", err);
      }
      await fetchTransactions();
    }
  };

  const getTransactionForFood = (foodId: string) => {
    return transactions.find(t => t.food_id === foodId && t.status !== "cancelled");
  };

  return (
    <TransactionContext.Provider value={{
      transactions,
      userStats,
      loading,
      requestFood,
      markCollected,
      markDonated,
      getTransactionForFood,
      refreshTransactions: fetchTransactions
    }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error("useTransactions must be used inside <TransactionProvider>");
  return ctx;
}