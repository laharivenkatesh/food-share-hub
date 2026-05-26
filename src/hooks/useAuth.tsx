import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";

export type Role = "Student" | "Provider" | "NGO";

export interface MockProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  streak: number;
  trustScore: number;
  created_at: string;
}

// Emulate a standard Supabase User for compatibility with existing modules
export interface JWTUser {
  id: string;
  phone: string;
  email: string;
  role: Role;
}

interface AuthContextValue {
  user: JWTUser | null;
  profile: MockProfile | null;
  loading: boolean;
  sendOtp: (phone: string, recaptchaVerifier: any) => Promise<{ ok: true; dev_otp?: string } | { ok: false; error: string }>;
  verifyOtp: (
    phone: string,
    otp: string,
    name?: string,
    role?: Role
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JWTUser | null>(null);
  const [profile, setProfile] = useState<MockProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

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
          phone: dbUser.phone,
          email: `${dbUser.phone.replace("+", "")}@zerra.local`,
          role: dbUser.role,
        };

        const mappedProfile: MockProfile = {
          id: dbUser._id || dbUser.id,
          name: dbUser.name || "New User",
          email: `${dbUser.phone.replace("+", "")}@zerra.local`,
          phone: dbUser.phone,
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
   * Triggers Firebase Phone Authentication client-side
   */
  const sendOtp = async (phone: string, recaptchaVerifier: any) => {
    try {
      let formattedPhone = phone.trim();
      if (/^\d{10}$/.test(formattedPhone) && !formattedPhone.startsWith("+")) {
        formattedPhone = `+91${formattedPhone}`; // Default to Indian prefix
      }

      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      setConfirmationResult(result);

      return {
        ok: true as const,
      };
    } catch (err: any) {
      console.error("Firebase sendOtp error:", err);
      return { ok: false as const, error: err.message || "Failed to send verification code via Firebase." };
    }
  };

  /**
   * Verifies the OTP code via Firebase and establishes a JWT session on our Express backend
   */
  const verifyOtp = async (phone: string, otp: string, name?: string, role?: Role) => {
    try {
      if (!confirmationResult) {
        return { ok: false as const, error: "No active verification session found. Please request a new code." };
      }

      const credential = await confirmationResult.confirm(otp);
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, name, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false as const, error: data.error || "Verification failed" };
      }

      const { token, user: dbUser } = data;
      localStorage.setItem("zerra_jwt_token", token);

      const mappedUser: JWTUser = {
        id: dbUser._id || dbUser.id,
        phone: dbUser.phone,
        email: `${dbUser.phone.replace("+", "")}@zerra.local`,
        role: dbUser.role,
      };

      const mappedProfile: MockProfile = {
        id: dbUser._id || dbUser.id,
        name: dbUser.name || "New User",
        email: `${dbUser.phone.replace("+", "")}@zerra.local`,
        phone: dbUser.phone,
        role: dbUser.role || "Student",
        streak: dbUser.streak || 1,
        trustScore: dbUser.trustScore || 4.5,
        created_at: dbUser.createdAt || new Date().toISOString(),
      };

      setUser(mappedUser);
      setProfile(mappedProfile);
      return { ok: true as const };
    } catch (err: any) {
      console.error("Firebase verifyOtp error:", err);
      return { ok: false as const, error: err.message || "Invalid code or verification expired." };
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
          email: `${dbUser.phone.replace("+", "")}@zerra.local`,
          phone: dbUser.phone,
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