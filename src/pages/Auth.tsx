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
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !agreed) {
      toast.error("Please accept the Terms & Conditions to continue.");
      return;
    }
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

          {mode === "signup" && (
            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-green-600 cursor-pointer shrink-0"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  I have read and agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setShowTerms(!showTerms)}
                    className="text-green-600 font-semibold underline underline-offset-2"
                  >
                    Terms & Conditions
                  </button>
                  , including the food safety disclaimer.
                </span>
              </label>

              {showTerms && (
                <div className="bg-muted rounded-xl p-4 text-xs text-muted-foreground space-y-2 leading-relaxed border border-border">
                  <p className="font-bold text-foreground text-sm">📋 Terms & Conditions</p>
                  <p>
                    By using Zerra, you acknowledge and agree to the following:
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">⚠️ Health & Safety Disclaimer:</span>{" "}
                    All food shared on this platform is donated voluntarily. The donor is not responsible
                    for any health issues, allergies, food poisoning, or adverse reactions that may arise
                    from consuming the shared food. Collect and consume at your own risk.
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">🥗 Food Quality:</span>{" "}
                    Donors must ensure food is safe, properly stored, and within a reasonable consumption
                    window. Recipients are advised to inspect food before consuming and use their own
                    judgment.
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">🤝 Community Responsibility:</span>{" "}
                    Users agree to use this platform in good faith, not misuse listings, and treat all
                    community members with respect.
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">🔒 Data:</span>{" "}
                    Your email and profile data are stored securely and never sold to third parties.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTerms(false)}
                    className="text-green-600 font-semibold mt-1"
                  >
                    Close ↑
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || (mode === "signup" && !agreed)}
            className="btn-primary !mt-5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Please wait…" : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}