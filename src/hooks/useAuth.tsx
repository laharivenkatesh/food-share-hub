import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";

export type Role = "Student" | "Provider" | "NGO";

export interface MockProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  streak: number;
  trustScore: number;
  created_at: string;
}

// Emulate a standard Supabase User for compatibility with existing modules
export interface JWTUser {
  id: string;
  phone?: string;
  email: string;
  role: Role;
}

interface AuthContextValue {
  user: JWTUser | null;
  profile: MockProfile | null;
  loading: boolean;
  sendOtp: (email: string) => Promise<{ ok: true; dev_otp?: string } | { ok: false; error: string }>;
  verifyOtp: (
    email: string,
    otp: string,
    name?: string,
    role?: Role,
    phone?: string,
    password?: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JWTUser | null>(null);
  const [profile, setProfile] = useState<MockProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize and restore session from localStorage JWT
  const initializeAuth = async () => {
    const token = localStorage.getItem("zerra_jwt_token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const dbUser = data.user;

        // Map MongoDB user to standard JWTUser and MockProfile structures for compatibility
        const mappedUser: JWTUser = {
          id: dbUser._id || dbUser.id,
          phone: dbUser.phone || "",
          email: dbUser.email,
          role: dbUser.role,
        };

        const mappedProfile: MockProfile = {
          id: dbUser._id || dbUser.id,
          name: dbUser.name || "New User",
          email: dbUser.email,
          phone: dbUser.phone || "",
          role: dbUser.role || "Student",
          streak: dbUser.streak || 1,
          trustScore: dbUser.trustScore || 4.5,
          created_at: dbUser.createdAt || new Date().toISOString(),
        };

        setUser(mappedUser);
        setProfile(mappedProfile);
      } else {
        // Token has expired or is invalid, clean it up
        localStorage.removeItem("zerra_jwt_token");
      }
    } catch (err) {
      console.error("Auth restoration error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * Triggers OTP sending endpoint on our Express backend (Google SMTP)
   */
  const sendOtp = async (email: string) => {
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false as const, error: data.error || "Failed to send OTP" };
      }

      return {
        ok: true as const,
        dev_otp: data.dev_otp, // Returned in sandbox mode when SMTP is not configured
      };
    } catch (err: any) {
      return { ok: false as const, error: err.message || "Connection to auth server failed." };
    }
  };

  /**
   * Verifies the OTP code on the backend and establishes a JWT session
   */
  const verifyOtp = async (
    email: string,
    otp: string,
    name?: string,
    role?: Role,
    phone?: string,
    password?: string
  ) => {
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, name, role, phone, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false as const, error: data.error || "Verification failed" };
      }

      const { token, user: dbUser } = data;
      localStorage.setItem("zerra_jwt_token", token);

      const mappedUser: JWTUser = {
        id: dbUser._id || dbUser.id,
        phone: dbUser.phone || "",
        email: dbUser.email,
        role: dbUser.role,
      };

      const mappedProfile: MockProfile = {
        id: dbUser._id || dbUser.id,
        name: dbUser.name || "New User",
        email: dbUser.email,
        phone: dbUser.phone || "",
        role: dbUser.role || "Student",
        streak: dbUser.streak || 1,
        trustScore: dbUser.trustScore || 4.5,
        created_at: dbUser.createdAt || new Date().toISOString(),
      };

      setUser(mappedUser);
      setProfile(mappedProfile);
      return { ok: true as const };
    } catch (err: any) {
      return { ok: false as const, error: err.message || "Connection to auth server failed." };
    }
  };

  /**
   * Refresh current profile details
   */
  const refreshProfile = async () => {
    const token = localStorage.getItem("zerra_jwt_token");
    if (!token) return;

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const dbUser = data.user;

        const mappedProfile: MockProfile = {
          id: dbUser._id || dbUser.id,
          name: dbUser.name || "New User",
          email: dbUser.email,
          phone: dbUser.phone || "",
          role: dbUser.role || "Student",
          streak: dbUser.streak || 1,
          trustScore: dbUser.trustScore || 4.5,
          created_at: dbUser.createdAt || new Date().toISOString(),
        };

        setProfile(mappedProfile);
      }
    } catch (err) {
      console.error("Error refreshing profile:", err);
    }
  };

  /**
   * Purges JWT session and log out
   */
  const logout = async () => {
    localStorage.removeItem("zerra_jwt_token");
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
        sendOtp,
        verifyOtp,
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