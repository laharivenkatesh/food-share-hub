import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
  role: "Student" | "Provider" | "NGO";
  streak: number;
  trustScore: number;
}

export interface JWTUser {
  id: string;
  phone?: string;
  email: string;
}

interface AuthContextValue {
  user: JWTUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  sendOtp: (email: string, password?: string, name?: string, phone?: string, mode?: "signup" | "login") => Promise<{ ok: true } | { ok: false; error: string }>;
  verifyOtp: (
    email: string,
    otp: string,
    type: "signup" | "recovery" | "magiclink"
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  resetPassword: (email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JWTUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize and restore session from Supabase
  const initializeAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { user: dbUser } = session;
        setUser({
          id: dbUser.id,
          email: dbUser.email || "",
          phone: dbUser.user_metadata?.phone || "",
        });

        let role: "Student" | "Provider" | "NGO" = "Provider";
        let dbPhone = dbUser.user_metadata?.phone || "";
        let dbName = dbUser.user_metadata?.name || "User";

        try {
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", dbUser.id)
            .single();

          if (profileRow) {
            role = profileRow.role || "Provider";
            if (profileRow.phone) dbPhone = profileRow.phone;
            if (profileRow.name) dbName = profileRow.name;
          }
        } catch (e) {
          console.error("Error fetching profile during init:", e);
        }

        setProfile({
          id: dbUser.id,
          name: dbName,
          email: dbUser.email || "",
          phone: dbPhone,
          created_at: dbUser.created_at,
          role,
          streak: 3,
          trustScore: 4.8,
        });
      }
    } catch (err) {
      console.error("Auth restoration error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeAuth();

    // Listen to Supabase auth changes automatically!
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          phone: session.user.user_metadata?.phone || "",
        });

        let role: "Student" | "Provider" | "NGO" = "Provider";
        let dbPhone = session.user.user_metadata?.phone || "";
        let dbName = session.user.user_metadata?.name || "User";

        try {
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (profileRow) {
            role = profileRow.role || "Provider";
            if (profileRow.phone) dbPhone = profileRow.phone;
            if (profileRow.name) dbName = profileRow.name;
          }
        } catch (e) {
          console.error("Error fetching profile on auth change:", e);
        }

        setProfile({
          id: session.user.id,
          name: dbName,
          email: session.user.email || "",
          phone: dbPhone,
          created_at: session.user.created_at,
          role,
          streak: 3,
          trustScore: 4.8,
        });
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Logs in a user using email and password
   */
  const login = async (email: string, password?: string) => {
    try {
      if (!password) throw new Error("Password is required for login.");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { ok: true as const };
    } catch (err: any) {
      return { ok: false as const, error: err.message || "Failed to log in." };
    }
  };

  /**
   * Triggers OTP sending via Supabase Auth
   */
  const sendOtp = async (email: string, password?: string, name?: string, phone?: string, mode?: "signup" | "login") => {
    try {
      if (mode === "signup" && password) {
        // Sign up logic - sends an OTP to email automatically if confirm email is enabled!
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
              phone: phone
            }
          }
        });
        
        if (error) throw error;
        return { ok: true as const };
      } else {
        // Login Logic - Since they want OTP on login, we use signInWithOtp
        const { error } = await supabase.auth.signInWithOtp({
          email,
        });
        if (error) throw error;
        return { ok: true as const };
      }
    } catch (err: any) {
      return { ok: false as const, error: err.message || "Failed to send OTP." };
    }
  };

  /**
   * Verifies the OTP code via Supabase
   */
  const verifyOtp = async (
    email: string,
    otp: string,
    type: "signup" | "recovery" | "magiclink"
  ) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: type,
      });

      if (error) throw error;
      
      // Auto-polling the page sign in logic is handled by onAuthStateChange!
      return { ok: true as const };
    } catch (err: any) {
      return { ok: false as const, error: err.message || "Verification failed." };
    }
  };

  /**
   * Triggers a password reset email
   */
  const resetPassword = async (email: string) => {
    try {
      if (!email) throw new Error("Email is required.");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/auth?mode=reset",
      });
      if (error) throw error;
      return { ok: true as const };
    } catch (err: any) {
      return { ok: false as const, error: err.message || "Failed to send reset email." };
    }
  };

  /**
   * Refresh current profile details
   */
  const refreshProfile = async () => {
    // With Supabase onAuthStateChange this is often unneeded, but implemented for compatibility
    await initializeAuth();
  };

  /**
   * Purges session and log out
   */
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        sendOtp,
        verifyOtp,
        resetPassword,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}