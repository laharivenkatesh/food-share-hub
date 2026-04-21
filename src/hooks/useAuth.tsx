import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User as SbUser } from "@supabase/supabase-js";
import { supabase, ProfileRow } from "@/lib/supabase";

export type Role = "Student" | "Provider" | "NGO";

interface AuthContextValue {
  user: SbUser | null;
  profile: ProfileRow | null;
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
  const [user, setUser] = useState<SbUser | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  // CRITICAL: subscribe BEFORE getSession to avoid missing events
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      // Defer profile fetch to avoid deadlocks inside the callback
      if (sess?.user) {
        setTimeout(() => fetchProfile(sess.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) fetchProfile(sess.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile((data as ProfileRow | null) ?? null);
  };

  const login: AuthContextValue["login"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const signup: AuthContextValue["signup"] = async ({ name, email, phone, password, role }) => {
    if (!name.trim()) return { ok: false, error: "Name required" };
    if (password.length < 6) return { ok: false, error: "Password must be 6+ characters" };

    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { name: name.trim(), phone: phone?.trim() ?? null, role },
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
