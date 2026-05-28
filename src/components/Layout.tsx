import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, PlusCircle, User, Leaf, Bell, BellOff, Trash2, CheckCheck, Volume2, VolumeX, Inbox, Clock } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useEffect, useState, useRef } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useAllFoods } from "@/hooks/useMyPosts";
import { supabase } from "@/lib/supabase";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatTimeAgo(dateStr: string) {
  try {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    if (isNaN(diffMs) || diffMs < 0) return "Just now";
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch {
    return "Recently";
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const hideNav = location.pathname === "/auth";

  const { transactions } = useTransactions();
  const { foods } = useAllFoods();
  const [oppositeProfiles, setOppositeProfiles] = useState<Record<string, any>>({});
  const bellDistancesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const fetchProfiles = async () => {
      if (transactions.length > 0 && user) {
        const otherUserIds = Array.from(new Set(
          transactions.map(t => t.donor_id === user.id ? t.collector_id : t.donor_id)
        ));

        if (otherUserIds.length > 0) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .in("id", otherUserIds);

          if (data) {
            const profileMap: Record<string, any> = {};
            data.forEach(p => {
              profileMap[p.id] = p;
            });
            setOppositeProfiles(profileMap);
          }
        }
      }
    };
    fetchProfiles();
  }, [transactions, user]);

  const hasActiveBookings = transactions.some(t =>
    t.donor_id === user?.id &&
    t.collector_id !== user?.id &&
    t.status === "pending"
  );

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    soundEnabled,
    setSoundEnabled,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handleViewNotif = (e: Event) => {
      const notif = (e as CustomEvent).detail;
      if (notif?.food_id) {
        nav(`/food/${notif.food_id}`);
        markAsRead(notif.id);
        setDrawerOpen(false);
      }
    };
    window.addEventListener("view-food-notification", handleViewNotif);
    return () => window.removeEventListener("view-food-notification", handleViewNotif);
  }, [nav, markAsRead]);

  const handleSignOut = async () => {
    await logout();
    nav("/auth");
  };

  const filteredNotifs = notifications.filter(
    (n) => activeTab === "all" || !n.is_read
  );

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative shadow-card">
      {!hideNav && (
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-primary-deep flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-deep-foreground" />
            </div>
            <span className="font-extrabold text-xl text-foreground tracking-tight">Zerra</span>
          </Link>
          
          {user && (
            <div className="flex items-center gap-2.5">
              {/* Premium Notification Center Bell Button */}
              <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetTrigger asChild>
                  <button className={`relative w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-95 group ${
                    hasActiveBookings
                      ? "bg-orange-500/15 border border-orange-500/30 ring-2 ring-orange-500 ring-offset-1 shadow-[0_0_12px_rgba(249,115,22,0.4)] animate-pulse"
                      : "bg-muted/60 hover:bg-muted"
                  }`}>
                    <Bell className={`w-4.5 h-4.5 transition-colors ${
                      hasActiveBookings
                        ? "text-orange-500 animate-wiggle"
                        : unreadCount > 0
                        ? "text-primary-deep animate-wiggle"
                        : "text-foreground/80 group-hover:text-primary-deep"
                    }`} />
                    {(unreadCount > 0 || hasActiveBookings) && (
                      <span className={`absolute -top-1.5 -right-1.5 min-w-5 h-5 rounded-full text-white text-[10px] font-extrabold px-1 flex items-center justify-center border border-card shadow-soft animate-pulse ${
                        hasActiveBookings ? "bg-orange-500" : "bg-urgent"
                      }`}>
                        {hasActiveBookings ? "!" : unreadCount}
                      </span>
                    )}
                  </button>
                </SheetTrigger>
                
                <SheetContent side="right" className="w-full max-w-sm flex flex-col p-0 border-l border-border bg-card">
                  {/* Drawer Header */}
                  <div className="px-5 pt-6 pb-4 border-b border-border bg-muted/20">
                    <SheetHeader className="space-y-1 text-left sm:text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-primary-deep/15 flex items-center justify-center">
                            <Bell className="w-4 h-4 text-primary-deep" />
                          </div>
                          <SheetTitle className="text-lg font-extrabold text-foreground">Notifications</SheetTitle>
                        </div>
                        
                        {/* Sound Setting Toggle */}
                        <button
                          onClick={() => setSoundEnabled(!soundEnabled)}
                          className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                          title={soundEnabled ? "Mute alert sound" : "Unmute alert sound"}
                        >
                          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-destructive" />}
                        </button>
                      </div>
                      
                      <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mt-1">
                        <span>{unreadCount} unread food alert{unreadCount !== 1 && "s"}</span>
                      </div>
                    </SheetHeader>

                    {/* Filter Tabs */}
                    <div className="flex mt-4 bg-muted/60 p-1 rounded-xl">
                      <button
                        onClick={() => setActiveTab("all")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          activeTab === "all" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        All ({notifications.length})
                      </button>
                      <button
                        onClick={() => setActiveTab("unread")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          activeTab === "unread" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Unread ({unreadCount})
                      </button>
                    </div>
                  </div>

                  {/* Drawer Action Tools */}
                  {notifications.length > 0 && (
                    <div className="px-5 py-2.5 bg-muted/10 border-b border-border flex items-center justify-between text-xs">
                      {unreadCount > 0 ? (
                        <button
                          onClick={markAllAsRead}
                          className="flex items-center gap-1 font-bold text-primary-deep hover:underline"
                        >
                          <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                        </button>
                      ) : (
                        <div />
                      )}
                      <button
                        onClick={clearAll}
                        className="flex items-center gap-1 font-bold text-destructive hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear all
                      </button>
                    </div>
                  )}

                  {/* Notifications List */}
                  <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-3">
                    {filteredNotifs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-10 opacity-70">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl shadow-soft">
                          🍱
                        </div>
                        <div>
                          <p className="font-extrabold text-foreground text-sm">All caught up!</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {activeTab === "unread" ? "No unread food listings found." : "No notifications posted yet."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      filteredNotifs.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            nav(`/food/${notif.food_id}`);
                            markAsRead(notif.id);
                            setDrawerOpen(false);
                          }}
                          className={`group card-soft p-3.5 border transition-all cursor-pointer hover:border-primary-deep/30 active:scale-[0.99] relative flex items-start gap-3 ${
                            notif.is_read
                              ? "bg-card border-border/60 opacity-85 hover:opacity-100"
                              : "bg-primary/5 border-primary-deep/15 hover:bg-primary/10 shadow-soft"
                          }`}
                        >
                          {/* Unread indicator dot */}
                          {!notif.is_read && (
                            <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-success ring-4 ring-success/15" />
                          )}
                          
                          <div className="flex-1 min-w-0 space-y-1 pr-4">
                            <h4 className="font-extrabold text-sm leading-snug text-foreground flex items-center gap-1.5">
                              {notif.title}
                            </h4>
                            <p className="text-xs leading-relaxed text-muted-foreground font-medium group-hover:text-foreground/90 transition-colors">
                              {notif.message}
                            </p>
                            <span className="inline-block text-[10px] font-bold text-muted-foreground/80 pt-0.5">
                              {formatTimeAgo(notif.created_at)}
                            </span>

                            {/* Live Booking & Distance tracking inside the notification card */}
                            {(() => {
                              const matchingTxs = transactions.filter(t => 
                                t.food_id === notif.food_id && 
                                t.status !== "cancelled" &&
                                (t.donor_id === user.id || t.collector_id === user.id)
                              );

                              if (matchingTxs.length === 0) return null;

                              return (
                                <div className="mt-2.5 space-y-2">
                                  {matchingTxs.map((t) => {
                                    const isDonorCheck = t.donor_id === user.id;
                                    const oppProfile = oppositeProfiles[isDonorCheck ? t.collector_id : t.donor_id];
                                    const foodItem = foods.find(f => f.id === t.food_id);

                                    let distanceText = "Location untracked";
                                    let distanceIndicator = "";

                                    if (t.collector_lat && t.collector_lng && foodItem?.lat && foodItem?.lng) {
                                      const currentDist = calculateDistance(foodItem.lat, foodItem.lng, t.collector_lat, t.collector_lng);
                                      const prevDist = bellDistancesRef.current[t.id];

                                      if (prevDist !== undefined) {
                                        if (currentDist < prevDist - 0.005) {
                                          distanceIndicator = "Coming closer! 🟢";
                                        } else if (currentDist > prevDist + 0.005) {
                                          distanceIndicator = "Moving away 🔴";
                                        } else {
                                          distanceIndicator = "Stationary 🟡";
                                        }
                                      } else {
                                        distanceIndicator = "Tracking 🟡";
                                      }

                                      bellDistancesRef.current[t.id] = currentDist;
                                      distanceText = `${currentDist.toFixed(2)} km away`;
                                    }

                                    return (
                                      <div 
                                        key={t.id} 
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2.5 rounded-xl bg-muted/65 border border-border/80 text-[11px] space-y-1.5 font-semibold text-foreground"
                                      >
                                        <div className="flex items-center justify-between border-b border-border/40 pb-1.5 mb-1">
                                          <span className="text-[9px] uppercase font-bold text-muted-foreground">
                                            {isDonorCheck ? "👤 Booked User" : "👤 Provider"}
                                          </span>
                                          <span className="badge-pill bg-primary-deep/10 text-primary-deep !text-[9px] font-extrabold normal-case py-0.5 px-1.5">
                                            {t.portions} portions
                                          </span>
                                        </div>
                                        
                                        <div className="space-y-0.5 leading-normal">
                                          <p className="font-extrabold text-foreground">{oppProfile?.name || (isDonorCheck ? "Loading..." : foodItem?.provider.name || "Unknown")}</p>
                                          <p className="text-muted-foreground flex items-center gap-1">📞 {oppProfile?.phone || (isDonorCheck ? "No phone" : foodItem?.provider.phone || "No phone")}</p>
                                          <p className="text-muted-foreground flex items-center gap-1 truncate max-w-[200px]">✉️ {oppProfile?.email || (isDonorCheck ? "No email" : foodItem?.provider.email || "No email")}</p>
                                        </div>

                                        {t.collector_lat && t.collector_lng && (
                                          <div className="pt-1.5 border-t border-border/40 mt-1 flex items-center justify-between text-[10px] font-bold text-emerald-600">
                                            <span>📍 {distanceText}</span>
                                            <span className="text-[9px] font-extrabold bg-emerald-500/10 px-1 py-0.5 rounded tracking-wide">
                                              {distanceIndicator}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Quick delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif.id);
                            }}
                            className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-muted transition-colors self-center opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Delete alert"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              <Link
                to="/dashboard"
                className="px-3 py-1.5 rounded-xl bg-primary-deep text-primary-deep-foreground text-xs font-extrabold shadow-sm hover:opacity-90 active:scale-95 transition-all"
              >
                Dashboard
              </Link>
            </div>
          )}
        </header>
      )}

      <main className="flex-1 pb-24">{children}</main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border px-4 py-2 flex items-center justify-around z-50 shadow-card">
          <NavItem to="/" icon={<Home className="w-5 h-5" />} label="Home" />
          <NavItem to="/expired" icon={<Clock className="w-5 h-5" />} label="Expired" />
          <NavItem to="/post" icon={<PlusCircle className="w-7 h-7" />} label="Post" highlight />
          <NavItem to="/activity" icon={<User className="w-5 h-5" />} label="Profile" />
        </nav>
      )}

    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  highlight,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all ${isActive ? "text-primary-deep" : "text-muted-foreground"
        } ${highlight ? "scale-110" : ""}`
      }
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </NavLink>
  );
}