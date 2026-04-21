import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

export type Role = "Student" | "Provider" | "NGO";

export interface MockProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  created_at: string;
}

interface AuthContextValue {
  user: User | null;
  profile: MockProfile | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signup: (data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: Role;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MockProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile row from the profiles table
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("fetchProfile error:", error);
      return null;
    }
    return data as MockProfile;
  };

  useEffect(() => {
    // Get the current session on mount — Supabase persists this in localStorage
    // automatically, so the user stays logged in across page refreshes and
    // app restarts until they manually sign out.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        setProfile(p);
      }
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ---------------------------------------------------------------------------
  // login
  // ---------------------------------------------------------------------------
  const login: AuthContextValue["login"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  // ---------------------------------------------------------------------------
  // signup — creates Supabase Auth user then inserts a profiles row
  // ---------------------------------------------------------------------------
  const signup: AuthContextValue["signup"] = async ({
    name,
    email,
    phone,
    password,
    role,
  }) => {
    if (!name.trim()) return { ok: false, error: "Name required" };
    if (password.length < 6)
      return { ok: false, error: "Password must be 6+ characters" };

    // 1. Create the Supabase Auth user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signUpError) return { ok: false, error: signUpError.message };
    if (!data.user)
      return { ok: false, error: "Signup failed — please try again." };

    // 2. Insert the public profile row
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      role,
    });

    if (profileError) {
      console.error("Profile insert error:", profileError);
      return {
        ok: false,
        error: "Account created but profile save failed: " + profileError.message,
      };
    }

    return { ok: true };
  };

  // ---------------------------------------------------------------------------
  // logout
  // ---------------------------------------------------------------------------
  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, session, loading, login, signup, logout }}
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