import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Role = "Student" | "Provider" | "NGO";

export interface MockProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  created_at: string;
}

// Internal type that includes password — never leaves this module
interface StoredUser extends MockProfile {
  password: string;
}

interface AuthContextValue {
  user: { id: string; email: string } | null;
  profile: MockProfile | null;
  session: { access_token: string } | null;
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

// ---------------------------------------------------------------------------
// In-memory user registry — lives only for the lifetime of the browser tab.
// Passwords are NEVER persisted to any storage. The session (profile without
// password) is kept in localStorage so the user stays logged in across
// page refreshes and app restarts until they manually sign out.
// ---------------------------------------------------------------------------
const inMemoryUsers: StoredUser[] = [];

const SESSION_KEY = "zerra_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<MockProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage on mount (no user data — just the
    // public profile stored when the user last logged in / signed up).
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as MockProfile;
        setSession({ access_token: "mock_token" });
        setUser({ id: parsed.id, email: parsed.email });
        setProfile(parsed);
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setLoading(false);
  }, []);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  const persistSession = (p: MockProfile) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(p));
    setSession({ access_token: "mock_token" });
    setUser({ id: p.id, email: p.email });
    setProfile(p);
  };

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------
  const login: AuthContextValue["login"] = async (email, password) => {
    const found = inMemoryUsers.find(
      (u) =>
        u.email.toLowerCase() === email.trim().toLowerCase() &&
        u.password === password
    );

    if (!found) {
      return {
        ok: false,
        error:
          "Invalid email or password. Note: accounts are session-only — please sign up again if you refreshed the page.",
      };
    }

    const { password: _pw, ...publicProfile } = found;
    persistSession(publicProfile);
    return { ok: true };
  };

  // -------------------------------------------------------------------------
  // signup
  // -------------------------------------------------------------------------
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

    const emailExists = inMemoryUsers.some(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (emailExists) return { ok: false, error: "Email is already registered" };

    if (phone?.trim()) {
      const phoneExists = inMemoryUsers.some((u) => u.phone === phone.trim());
      if (phoneExists)
        return { ok: false, error: "Phone number is already registered" };
    }

    const newUser: StoredUser = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      role,
      created_at: new Date().toISOString(),
      password, // stored only in memory
    };

    inMemoryUsers.push(newUser);

    const { password: _pw, ...publicProfile } = newUser;
    persistSession(publicProfile);
    return { ok: true };
  };

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------
  const logout = async () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setUser(null);
    setProfile(null);
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