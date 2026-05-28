import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
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

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    mealsCollected: 0,
    animalsFed: 0,
    postsMade: 0,
    pickupSuccess: 0,
    badges: []
  });
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .or(`donor_id.eq.${user.id},collector_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching transactions:", error);
      } else {
        setTransactions(data || []);
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
    let timerId: NodeJS.Timeout;
    let active = true;

    const poll = async () => {
      if (!active) return;
      await fetchTransactions();
      if (active) {
        timerId = setTimeout(poll, 1000);
      }
    };

    fetchTransactions().then(() => {
      if (active) {
        timerId = setTimeout(poll, 1000);
      }
    });

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
      active = false;
      clearTimeout(timerId);
      supabase.removeChannel(channel);
    };
  }, [fetchTransactions]);

  useEffect(() => {
    computeStats();
  }, [transactions, computeStats]);

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

    const newCollectorAccepted = true;
    const newStatus = tx.donor_accepted && newCollectorAccepted ? "completed" : "accepted";

    const { error } = await supabase
      .from("transactions")
      .update({
        collector_accepted: newCollectorAccepted,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", transactionId);

    if (!error) {
      if (newStatus === "completed") {
        await syncFoodStatusOnCompletion(tx.food_id);
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

    const newDonorAccepted = true;
    const newStatus = newDonorAccepted && tx.collector_accepted ? "completed" : "accepted";

    const { error } = await supabase
      .from("transactions")
      .update({
        donor_accepted: newDonorAccepted,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", transactionId);

    if (!error) {
      if (newStatus === "completed") {
        await syncFoodStatusOnCompletion(tx.food_id);
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