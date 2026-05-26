import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  ShieldCheck,
  Calendar,
  Sparkles,
  Flame,
  Award,
  LogOut,
  MapPin,
  RefreshCw,
  Cookie,
  FolderLock,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, logout, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"session" | "stats">("session");

  // JWT parsing state
  const [jwtHeader, setJwtHeader] = useState<any>(null);
  const [jwtPayload, setJwtPayload] = useState<any>(null);

  // Decode JWT local storage token to display insights
  useEffect(() => {
    const token = localStorage.getItem("zerra_jwt_token");
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

  if (!user || !profile) {
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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-up">
      
      {/* Header Breadcrumbs */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Foods Feed
        </button>
        
        <button
          onClick={handleRefresh}
          disabled={busy}
          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:bg-muted transition-all"
          title="Refresh profile details"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${busy ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Main Profile Showcase Card */}
      <div className="card-soft relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 p-6 md:p-8 text-white shadow-xl border border-emerald-800">
        {/* Subtle decorative background gradients */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-green-500/10 rounded-full blur-2xl -z-10" />

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          {/* Avatar Icon */}
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-emerald-800/40 border border-emerald-500/30 flex items-center justify-center text-4xl shadow-inner shrink-0 backdrop-blur">
            🧑
          </div>

          {/* Profile basic info */}
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{profile.name}</h1>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500 text-emerald-950 border border-emerald-400/30 w-max mx-auto md:mx-0 shadow-sm">
                {profile.role}
              </span>
            </div>
            
            <p className="text-emerald-300 font-semibold text-sm flex items-center justify-center md:justify-start gap-1">
              <MapPin className="w-4 h-4" /> {profile.phone}
            </p>

            <p className="text-xs text-emerald-200/70 flex items-center justify-center md:justify-start gap-1">
              <Calendar className="w-3.5 h-3.5" /> Registered: {formatDate(profile.created_at)}
            </p>
          </div>

          {/* Secure Logout Trigger */}
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0 active:scale-95"
          >
            <LogOut className="w-4 h-4" /> Secure Sign Out
          </button>
        </div>

        {/* Dynamic Achievements / Trust Banner */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-emerald-800/50 mt-6 pt-6 text-center md:text-left">
          
          <div className="flex items-center justify-center md:justify-start gap-3 bg-emerald-950/40 border border-emerald-800/20 p-3 rounded-2xl">
            <Flame className="w-8 h-8 text-orange-400 animate-pulse" />
            <div>
              <p className="text-[10px] font-bold text-emerald-200/50 uppercase tracking-wide">Sharing Streak</p>
              <p className="text-lg font-black text-white">{profile.streak} Days</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-3 bg-emerald-950/40 border border-emerald-800/20 p-3 rounded-2xl">
            <Award className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-[10px] font-bold text-emerald-200/50 uppercase tracking-wide">Trust score</p>
              <p className="text-lg font-black text-white">{profile.trustScore} / 5</p>
            </div>
          </div>

          <div className="col-span-2 md:col-span-1 flex items-center justify-center md:justify-start gap-3 bg-emerald-950/40 border border-emerald-800/20 p-3 rounded-2xl">
            <Sparkles className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-[10px] font-bold text-emerald-200/50 uppercase tracking-wide">Reliability Level</p>
              <p className="text-lg font-black text-white">Elite Member</p>
            </div>
          </div>

        </div>
      </div>

      {/* Segmented Control / Tabs */}
      <div className="flex border-b border-border bg-card p-1 rounded-2xl shadow-sm">
        <button
          onClick={() => setActiveTab("session")}
          className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "session"
              ? "bg-muted text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FolderLock className="w-4 h-4" /> JWT Session Details
        </button>
        
        <button
          onClick={() => setActiveTab("stats")}
          className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "stats"
              ? "bg-muted text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Sharing Metrics
        </button>
      </div>

      {/* Tab Panels */}
      <div className="animate-fade-up">
        {activeTab === "session" ? (
          /* ================= PANEL 1: SECURE SESSION DETAILS (JWT CONSOLE) ================= */
          <div className="space-y-6">
            
            <div className="card-soft p-5 border border-border bg-card space-y-4">
              <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> Cryptographic JWT Inspection
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This console extracts and displays your cryptographically signed active Web Token (JWT) session. 
                The signature is securely verified on each server request, preventing session spoofing.
              </p>

              {jwtHeader && jwtPayload ? (
                <div className="space-y-4">
                  {/* Part 1: JWT Header */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <span>1. JWT Decoded Header</span>
                      <span className="badge-pill bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">Header</span>
                    </div>
                    <pre className="bg-muted p-4 rounded-xl text-xs font-mono text-foreground overflow-x-auto border border-border">
                      {JSON.stringify(jwtHeader, null, 2)}
                    </pre>
                  </div>

                  {/* Part 2: JWT Claims */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <span>2. Decoded Claims Payload</span>
                      <span className="badge-pill bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Payload</span>
                    </div>
                    <pre className="bg-muted p-4 rounded-xl text-xs font-mono text-foreground overflow-x-auto border border-border">
                      {JSON.stringify(jwtPayload, null, 2)}
                    </pre>
                  </div>

                  {/* Extra metadata grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    
                    <div className="p-3 bg-muted/40 border border-border rounded-xl flex items-center gap-3">
                      <Cookie className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Algorithm Used</p>
                        <p className="text-xs font-extrabold text-foreground">{jwtHeader.alg || "HS256"}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-muted/40 border border-border rounded-xl flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Expiry Epoch Time</p>
                        <p className="text-xs font-extrabold text-foreground">
                          {jwtPayload.exp ? new Date(jwtPayload.exp * 1000).toLocaleString() : "Never"}
                        </p>
                      </div>
                    </div>

                  </div>

                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground italic bg-muted rounded-2xl border border-dashed border-border">
                  No active local storage JWT found. Please log in again to populate session parameters.
                </div>
              )}
            </div>

            {/* Security Best Practices Toast Card */}
            <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-foreground">Session Security Integrity</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your token is stored locally to maintain seamless authentication. Upon calling secure REST actions, 
                  the server extracts this token from the <code className="bg-muted px-1 rounded font-mono text-[11px]">Authorization Bearer</code> header, 
                  checks the cryptographic signature, and executes operations.
                </p>
              </div>
            </div>

          </div>
        ) : (
          /* ================= PANEL 2: SHARING METRICS ================= */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="card-soft p-5 border border-border bg-card space-y-4">
              <h3 className="text-sm font-extrabold text-foreground">Your Contribution Summary</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                By participating in Zerra's food redistribution network, you are directly mitigating waste and supporting local NGOs.
              </p>
              
              <div className="space-y-3.5 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold text-muted-foreground mb-1.5">
                    <span>Community Meals Saved</span>
                    <span>14 / 20 Saved</span>
                  </div>
                  <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden border border-border">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: "70%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-muted-foreground mb-1.5">
                    <span>CO2 Offset (Carbon footprint reduction)</span>
                    <span>8.5 kg Offset</span>
                  </div>
                  <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden border border-border">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: "45%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-muted-foreground mb-1.5">
                    <span>NGO Partnerships Supported</span>
                    <span>4 Partners</span>
                  </div>
                  <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden border border-border">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: "90%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card-soft p-5 border border-border bg-card space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-sm font-extrabold text-foreground">Next Action Steps</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Join other providers and students in sharing leftovers or requesting items nearby.
                </p>
              </div>

              <div className="space-y-2 pt-4">
                <button
                  onClick={() => navigate("/")}
                  className="w-full py-3 px-4 rounded-xl bg-primary-deep text-white font-bold text-xs flex items-center justify-between hover:opacity-95 transition-all shadow-sm group"
                >
                  Browse Available Food Listings
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => navigate("/post")}
                  className="w-full py-3 px-4 rounded-xl bg-muted text-foreground border border-border font-bold text-xs flex items-center justify-between hover:bg-muted/70 transition-all"
                >
                  Create a Leftover Food Post
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
