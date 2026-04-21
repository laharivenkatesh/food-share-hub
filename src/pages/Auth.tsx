import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useAuth, Role } from "@/hooks/useAuth";
import { toast } from "sonner";

const roles: Role[] = ["Student", "Provider", "NGO"];

export default function Auth() {
  const nav = useNavigate();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<Role>("Student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res =
      mode === "login"
        ? await login(email, password)
        : await signup({ name, email, phone, password, role });
    setBusy(false);

    if (res.ok === false) {
      toast.error(res.error);
      return;
    }
    toast.success(mode === "login" ? "Welcome back!" : "Account created — check your email if confirmation is required");
    nav("/");
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-6">
      <div className="w-full max-w-sm card-soft p-7 space-y-6 animate-fade-up">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-deep flex items-center justify-center shadow-soft">
            <Leaf className="w-7 h-7 text-primary-deep-foreground" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Zerra</h1>
          <p className="text-sm text-muted-foreground">Share leftover food, save the planet</p>
        </div>

        <div className="flex bg-muted rounded-2xl p-1">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                mode === m ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input
              className="input-field"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            className="input-field"
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {mode === "signup" && (
            <input
              className="input-field"
              type="tel"
              placeholder="Phone Number (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          )}
          <input
            className="input-field"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          {mode === "signup" && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Role</p>
              <div className="flex gap-2 flex-wrap">
                {roles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`chip ${role === r ? "chip-active" : "chip-default"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={busy} className="btn-primary !mt-5">
            {busy ? "Please wait…" : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
