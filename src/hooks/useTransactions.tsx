import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./useAuth";

export type TransactionStatus = "floating" | "completed" | "cancelled";

export interface Transaction {
  id: string;
  foodId: string;
  donorId: string;
  collectorId: string;
  status: TransactionStatus;
  donorAccepted: boolean;
  collectorAccepted: boolean;
  createdAt: string;
}

interface UserStats {
  mealsCollected: number;
  animalsFed: number;
  postsMade: number;
  pickupSuccess: number;
  badges: { icon: string; text: string }[];
}

interface TransactionContextValue {
  transactions: Transaction[];
  userStats: UserStats;
  requestFood: (foodId: string, donorId: string) => void;
  markCollected: (foodId: string) => void;
  markDonated: (foodId: string) => void;
  getTransactionForFood: (foodId: string) => Transaction | undefined;
}

const TransactionContext = createContext<TransactionContextValue | null>(null);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("zerra_transactions");
    if (stored) {
      try {
        setTransactions(JSON.parse(stored));
      } catch {
        setTransactions([]);
      }
    }
  }, []);

  const saveTransactions = (newTransactions: Transaction[]) => {
    setTransactions(newTransactions);
    localStorage.setItem("zerra_transactions", JSON.stringify(newTransactions));
  };

  const requestFood = (foodId: string, donorId: string) => {
    if (!user) return;
    
    // Prevent multiple requests for the same food by the same user
    if (transactions.find(t => t.foodId === foodId && t.status !== "cancelled")) return;

    const newTx: Transaction = {
      id: "tx_" + Math.random().toString(36).substring(2, 9),
      foodId,
      donorId,
      collectorId: user.id,
      status: "floating",
      donorAccepted: false,
      collectorAccepted: false,
      createdAt: new Date().toISOString(),
    };
    saveTransactions([...transactions, newTx]);
  };

  const updateTransaction = (foodId: string, updates: Partial<Transaction>) => {
    let updatedTx: Transaction | undefined;
    const newTransactions = transactions.map(t => {
      if (t.foodId === foodId && t.status === "floating") {
        updatedTx = { ...t, ...updates };
        // Check if both accepted
        if (updatedTx.donorAccepted && updatedTx.collectorAccepted) {
          updatedTx.status = "completed";
        }
        return updatedTx;
      }
      return t;
    });
    saveTransactions(newTransactions);
  };

  const markCollected = (foodId: string) => {
    updateTransaction(foodId, { collectorAccepted: true });
  };

  const markDonated = (foodId: string) => {
    updateTransaction(foodId, { donorAccepted: true });
  };

  const getTransactionForFood = (foodId: string) => {
    return transactions.find(t => t.foodId === foodId && t.status !== "cancelled");
  };

  // Calculate stats based on completed transactions
  const computeStats = (): UserStats => {
    if (!user) return { mealsCollected: 0, animalsFed: 0, postsMade: 0, pickupSuccess: 0, badges: [] };

    let mealsCollected = 0;
    let animalsFed = 0; // Mock increment if they fed animals. Let's say 2 animals per animal-food transaction.
    let postsMade = 0; // In a real app, this comes from food posts. Here we count completed donations.
    let successfulTransactions = 0;
    let totalInvolved = 0;

    transactions.forEach(t => {
      if (t.collectorId === user.id) {
        totalInvolved++;
        if (t.status === "completed") {
          successfulTransactions++;
          mealsCollected += 5; // Assuming avg 5 meals per collection
        }
      }
      if (t.donorId === user.id) {
        totalInvolved++;
        if (t.status === "completed") {
          successfulTransactions++;
          postsMade++;
        }
      }
    });

    const pickupSuccess = totalInvolved === 0 ? 0 : Math.round((successfulTransactions / totalInvolved) * 100);

    const badges: { icon: string; text: string }[] = [];
    if (postsMade > 0) badges.push({ icon: "🪴", text: "Consistent Provider" });
    if (mealsCollected > 0) badges.push({ icon: "💛", text: "Regular Helper" });
    if (pickupSuccess >= 90 && successfulTransactions > 0) badges.push({ icon: "🏆", text: "Top Contributor" });
    if (mealsCollected > 10) badges.push({ icon: "⚡", text: "Quick Rescuer" });

    return {
      mealsCollected,
      animalsFed,
      postsMade,
      pickupSuccess,
      badges
    };
  };

  return (
    <TransactionContext.Provider value={{ 
      transactions, 
      userStats: computeStats(), 
      requestFood, 
      markCollected, 
      markDonated, 
      getTransactionForFood 
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
