import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Role = "Student" | "Provider" | "NGO";

export interface MockProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  created_at: string;
  password?: string;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<MockProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load session from local storage on mount
    const storedSession = localStorage.getItem("zerra_session");
    if (storedSession) {
      try {
        const parsedProfile = JSON.parse(storedSession) as MockProfile;
        setSession({ access_token: "mock_token" });
        setUser({ id: parsedProfile.id, email: parsedProfile.email });
        setProfile(parsedProfile);
      } catch {
        localStorage.removeItem("zerra_session");
      }
    }
    setLoading(false);
  }, []);

  const login: AuthContextValue["login"] = async (email, password) => {
    const usersJson = localStorage.getItem("zerra_users") || "[]";
    const users: MockProfile[] = JSON.parse(usersJson);
    
    const found = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
    if (!found) {
      return { ok: false, error: "Invalid email or password" };
    }

    const sessionProfile = { ...found };
    delete sessionProfile.password;
    
    localStorage.setItem("zerra_session", JSON.stringify(sessionProfile));
    setSession({ access_token: "mock_token" });
    setUser({ id: sessionProfile.id, email: sessionProfile.email });
    setProfile(sessionProfile);
    
    return { ok: true };
  };

  const signup: AuthContextValue["signup"] = async ({ name, email, phone, password, role }) => {
    if (!name.trim()) return { ok: false, error: "Name required" };
    if (password.length < 6) return { ok: false, error: "Password must be 6+ characters" };

    const usersJson = localStorage.getItem("zerra_users") || "[]";
    const users: MockProfile[] = JSON.parse(usersJson);

    const emailExists = users.some(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (emailExists) {
      return { ok: false, error: "Email is already registered" };
    }

    if (phone && phone.trim()) {
      const phoneExists = users.some(u => u.phone === phone.trim());
      if (phoneExists) {
        return { ok: false, error: "Phone number is already registered" };
      }
    }

    const newUser: MockProfile = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      role,
      created_at: new Date().toISOString(),
      password,
    };

    users.push(newUser);
    localStorage.setItem("zerra_users", JSON.stringify(users));

    const sessionProfile = { ...newUser };
    delete sessionProfile.password;

    localStorage.setItem("zerra_session", JSON.stringify(sessionProfile));
    setSession({ access_token: "mock_token" });
    setUser({ id: sessionProfile.id, email: sessionProfile.email });
    setProfile(sessionProfile);

    return { ok: true };
  };

  const logout = async () => {
    localStorage.removeItem("zerra_session");
    setSession(null);
    setUser(null);
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
