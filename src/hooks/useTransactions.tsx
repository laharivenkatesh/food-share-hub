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
  donor_accepted: boolean;
  collector_accepted: boolean;
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
  requestFood: (foodId: string, donorId: string) => Promise<void>;
  markCollected: (foodId: string) => Promise<void>;
  markDonated: (foodId: string) => Promise<void>;
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
    setLoading(false);
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
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    computeStats();
  }, [transactions, computeStats]);

  const requestFood = async (foodId: string, donorId: string) => {
    if (!user) return;

    const existing = transactions.find(t => t.food_id === foodId && t.status !== "cancelled");
    if (existing) return;

    const { error } = await supabase.from("transactions").insert({
      food_id: foodId,
      donor_id: donorId,
      collector_id: user.id,
      status: "pending",
      donor_accepted: false,
      collector_accepted: false,
    });

    if (error) {
      console.error("Error requesting food:", error);
    } else {
      await fetchTransactions();
    }
  };

  const markCollected = async (foodId: string) => {
    const { data: tx } = await supabase
      .from("transactions")
      .select("*")
      .eq("food_id", foodId)
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
      .eq("food_id", foodId);

    if (!error) {
      await fetchTransactions();
    }
  };

  const markDonated = async (foodId: string) => {
    const { data: tx } = await supabase
      .from("transactions")
      .select("*")
      .eq("food_id", foodId)
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
      .eq("food_id", foodId);

    if (!error) {
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