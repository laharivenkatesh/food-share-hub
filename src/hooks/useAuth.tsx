import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Role = "Student" | "Provider" | "NGO";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
}

interface StoredUser extends User {
  password: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  signup: (data: { name: string; email: string; phone?: string; password: string; role: Role }) =>
    | { ok: true }
    | { ok: false; error: string };
  logout: () => void;
}

const USERS_KEY = "zerra:users";
const SESSION_KEY = "zerra:session";

const AuthContext = createContext<AuthContextValue | null>(null);

const getUsers = (): StoredUser[] => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
};
const saveUsers = (users: StoredUser[]) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const login: AuthContextValue["login"] = (email, password) => {
    const e = email.trim().toLowerCase();
    if (!e || !password) return { ok: false, error: "Email and password required" };
    const users = getUsers();
    const u = users.find((x) => x.email.toLowerCase() === e);
    if (!u) return { ok: false, error: "No account found with this email" };
    if (u.password !== password) return { ok: false, error: "Incorrect password" };
    const { password: _p, ...safe } = u;
    setUser(safe);
    localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
    return { ok: true };
  };

  const signup: AuthContextValue["signup"] = ({ name, email, phone, password, role }) => {
    const e = email.trim().toLowerCase();
    if (!name.trim()) return { ok: false, error: "Name required" };
    if (!/^\S+@\S+\.\S+$/.test(e)) return { ok: false, error: "Invalid email address" };
    if (password.length < 6) return { ok: false, error: "Password must be 6+ characters" };
    const users = getUsers();
    if (users.some((x) => x.email.toLowerCase() === e)) {
      return { ok: false, error: "An account with this email already exists" };
    }
    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: e,
      phone: phone?.trim(),
      role,
      password,
    };
    saveUsers([...users, newUser]);
    const { password: _p, ...safe } = newUser;
    setUser(safe);
    localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
