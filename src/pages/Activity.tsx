import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  Leaf,
  ShieldCheck,
  Calendar,
  Sparkles,
  Flame,
  Award,
  MapPin,
  RefreshCw,
  Cookie,
  FolderLock,
  ChevronRight,
  TrendingUp,
  LogOut,
  Star,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useTransactions";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function Activity() {
  const navigate = useNavigate();
  const { user, profile, logout, refreshProfile } = useAuth();
  const { userStats } = useTransactions();
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"session" | "stats">("stats");

  // JWT parsing state
  const [jwtHeader, setJwtHeader] = useState<any>(null);
  const [jwtPayload, setJwtPayload] = useState<any>(null);

  // Decode JWT local storage token or Supabase session to display insights
  useEffect(() => {
    const fetchAndDecodeToken = async () => {
      let token = localStorage.getItem("zerra_jwt_token");
      if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
      }
      if (!token) return;

      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const headerDecoded = JSON.parse(atob(parts[0]));
          const payloadDecoded = JSON.parse(atob(parts[1]));
          setJwtHeader(headerDecoded);
          setJwtPayload(payloadDecoded);
        }
      } catch (e) {
        console.error("Failed to decode JWT locally:", e);
      }
    };

    fetchAndDecodeToken();
  }, [user]);

  const handleRefresh = async () => {
    setBusy(true);
    await refreshProfile();
    setBusy(false);
    toast.success("Profile reloaded from database!");
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to sign out of this secure session?")) {
      await logout();
      navigate("/auth");
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <p className="text-muted-foreground animate-pulse font-semibold">Loading secure session profile...</p>
        </div>
      </div>
    );
  }

  // Format UTC dates nicely
  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="px-5 py-6 space-y-6 max-w-md mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-3xl font-extrabold font-serif tracking-tight text-foreground">Profile</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={busy}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:bg-muted transition-all"
            title="Refresh profile details"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${busy ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center shadow-sm hover:bg-destructive hover:text-white transition-all text-destructive"
            title="Secure Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 rounded-[32px] p-5 relative overflow-hidden shadow-soft border border-emerald-800 text-white">
        <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -z-10" />
        
        <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="w-16 h-16 rounded-[20px] bg-emerald-800/40 border border-emerald-500/30 flex items-center justify-center shadow-inner shrink-0 backdrop-blur">
            <Leaf className="w-8 h-8 text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white truncate">{profile.name}</h2>
            <p className="text-xs text-emerald-300 font-semibold mt-0.5 flex items-center gap-1.5">
              <span>Community Member</span> 
              <span className="text-[10px]">•</span> 
              <span className="flex items-center gap-0.5"><Star className="w-3.5 h-3.5 fill-warning text-warning" /> {profile.trustScore}</span>
            </p>
            {profile.phone && (
              <p className="text-[11px] text-emerald-200/80 font-semibold mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> {profile.phone}
              </p>
            )}
            {profile.created_at && (
              <p className="text-[10px] text-emerald-200/60 font-semibold mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Reg: {formatDate(profile.created_at)}
              </p>
            )}
          </div>
        </div>

        <div className="bg-emerald-950/50 backdrop-blur-md rounded-[20px] py-3 px-4 flex items-center justify-between shadow-sm relative z-10 border border-emerald-800/50">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-100">
            <Flame className="w-4 h-4 text-orange-400 animate-pulse" /> {profile.streak} Day Streak
          </div>
          <span className="text-xs text-emerald-300 font-bold">Keep it going!</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard value={userStats.mealsCollected.toString()} label="Meals Collected" />
        <StatCard value={userStats.animalsFed.toString()} label="Animals Fed" />
        <StatCard value={userStats.postsMade.toString()} label="Posts Made" />
        <StatCard value={`${userStats.pickupSuccess}%`} label="Pickup Success" />
      </div>

      {/* Badges */}
      <div className="space-y-3 pt-1">
        <h3 className="text-lg font-extrabold font-serif text-foreground">Badges</h3>
        <div className="flex flex-wrap gap-2">
          {userStats.badges.length > 0 ? (
            userStats.badges.map(b => (
              <Badge key={b.text} icon={b.icon} text={b.text} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground font-bold">Complete transactions to earn badges!</p>
          )}
        </div>
      </div>

      {/* Segmented Control / Tabs */}
      <div className="flex border border-border bg-card p-1 rounded-2xl shadow-sm mt-6">
        <button
          onClick={() => setActiveTab("stats")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "stats"
              ? "bg-muted text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Sharing Metrics
        </button>
        
        <button
          onClick={() => setActiveTab("session")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "session"
              ? "bg-muted text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FolderLock className="w-4 h-4" /> JWT Session
        </button>
      </div>

      {/* Tab Panels */}
      <div className="animate-fade-up pt-1">
        {activeTab === "stats" ? (
          /* ================= PANEL: SHARING METRICS ================= */
          <div className="space-y-4">
            <div className="card-soft p-4 border border-border bg-card space-y-3">
              <h3 className="text-sm font-extrabold text-foreground">Your Contribution Summary</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                By participating in Zerra's food redistribution network, you are directly mitigating waste and supporting local communities.
              </p>
              
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs font-bold text-muted-foreground mb-1">
                    <span>Community Meals Saved</span>
                    <span>14 / 20 Saved</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden border border-border">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: "70%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-muted-foreground mb-1">
                    <span>CO2 Offset (Carbon reduction)</span>
                    <span>8.5 kg Offset</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden border border-border">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: "45%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-muted-foreground mb-1">
                    <span>NGO Partnerships Supported</span>
                    <span>4 Partners</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden border border-border">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: "90%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card-soft p-4 border border-border bg-card space-y-3">
              <h3 className="text-sm font-extrabold text-foreground">Next Action Steps</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate("/")}
                  className="py-3 px-2 rounded-xl bg-primary-deep text-white font-bold text-[11px] text-center hover:opacity-95 transition-all shadow-sm flex items-center justify-center gap-1"
                >
                  Browse Food <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => navigate("/post")}
                  className="py-3 px-2 rounded-xl bg-muted text-foreground border border-border font-bold text-[11px] text-center hover:bg-muted/70 transition-all flex items-center justify-center gap-1"
                >
                  Post Food <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= PANEL: SECURE SESSION DETAILS (JWT CONSOLE) ================= */
          <div className="space-y-4">
            <div className="card-soft p-4 border border-border bg-card space-y-3">
              <h2 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" /> Cryptographic JWT Inspection
              </h2>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                This console extracts and displays your cryptographically signed active Web Token (JWT) session. 
                The signature is securely verified on each server request, preventing session spoofing.
              </p>

              {jwtHeader && jwtPayload ? (
                <div className="space-y-3">
                  {/* Part 1: JWT Header */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <span>1. JWT Decoded Header</span>
                      <span className="badge-pill bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 !py-0.5">Header</span>
                    </div>
                    <pre className="bg-muted p-3 rounded-lg text-[10px] font-mono text-foreground overflow-x-auto border border-border max-h-32">
                      {JSON.stringify(jwtHeader, null, 2)}
                    </pre>
                  </div>

                  {/* Part 2: JWT Claims */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <span>2. Decoded Claims Payload</span>
                      <span className="badge-pill bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 !py-0.5">Payload</span>
                    </div>
                    <pre className="bg-muted p-3 rounded-lg text-[10px] font-mono text-foreground overflow-x-auto border border-border max-h-48">
                      {JSON.stringify(jwtPayload, null, 2)}
                    </pre>
                  </div>

                  {/* Extra metadata grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 bg-muted/40 border border-border rounded-xl flex items-center gap-2">
                      <Cookie className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Algorithm</p>
                        <p className="text-[10px] font-extrabold text-foreground truncate">{jwtHeader.alg || "HS256"}</p>
                      </div>
                    </div>

                    <div className="p-2.5 bg-muted/40 border border-border rounded-xl flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Expiry Time</p>
                        <p className="text-[10px] font-extrabold text-foreground truncate">
                          {jwtPayload.exp ? new Date(jwtPayload.exp * 1000).toLocaleDateString() : "Never"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground italic bg-muted rounded-xl border border-dashed border-border">
                  No active local storage JWT found. Please log in again to populate session parameters.
                </div>
              )}
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl flex items-start gap-2.5">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-extrabold text-foreground">Session Security Integrity</h4>
                <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                  Your token is stored locally to maintain seamless authentication. Upon calling secure REST actions, 
                  the server extracts this token from the authorization headers and verifies its signature.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-card rounded-[24px] p-5 shadow-sm border border-border/50">
      <div className="text-[28px] font-extrabold text-primary-deep mb-0.5">{value}</div>
      <div className="text-[13px] text-muted-foreground font-bold leading-tight">{label}</div>
    </div>
  );
}

function Badge({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="bg-card px-3.5 py-2.5 rounded-full flex items-center gap-2 shadow-sm border border-border/50 text-sm font-extrabold text-foreground">
      <span>{icon}</span> {text}
    </div>
  );
}
