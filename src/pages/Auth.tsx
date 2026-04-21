import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf } from "lucide-react";

const roles = ["Student", "Provider", "NGO"] as const;

export default function Auth() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<(typeof roles)[number]>("Student");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
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
        </div>

        <div className="flex bg-muted rounded-2xl p-1">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
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
          {mode === "signup" && <input className="input-field" placeholder="Full Name" required />}
          <input className="input-field" placeholder="Email or Phone" required />
          {mode === "signup" && <input className="input-field" placeholder="Phone Number" />}
          {mode === "signup" && <input className="input-field" placeholder="Email Address" type="email" />}
          <input className="input-field" placeholder="Password" type="password" required />

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

          <button type="submit" className="btn-primary !mt-5">
            {mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
