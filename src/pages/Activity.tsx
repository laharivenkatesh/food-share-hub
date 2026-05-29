import { Link, useNavigate } from "react-router-dom";
import {
  Leaf,
  Calendar,
  Flame,
  MapPin,
  ChevronRight,
  Star,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useTransactions";
import { useMyPosts } from "@/hooks/useMyPosts";
import { toast } from "sonner";

export default function Activity() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { userStats } = useTransactions();
  const { posts, removePost } = useMyPosts();

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

      {/* My Listings */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold font-serif text-foreground">My Listings</h3>
          <span className="badge-pill bg-primary/10 text-primary-deep font-extrabold text-xs">
            {posts.length} Total
          </span>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-6 bg-card rounded-[24px] border border-dashed border-border/80 space-y-1">
            <p className="text-2xl">📤</p>
            <p className="text-xs font-bold text-muted-foreground">You haven't posted any food yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((food) => {
              const remaining = food.feeds - (food.bookedPortions || 0);
              const isCollected = food.status === "collected";
              const isReserved = food.status === "reserved";
              const isFullyBooked = remaining <= 0;

              let statusText = food.status as string;
              let statusColorClass = "bg-success/10 text-success border border-success/20";
              if (isCollected) {
                statusText = "collected";
                statusColorClass = "bg-muted text-muted-foreground border border-border";
              } else if (isReserved || isFullyBooked) {
                statusText = isFullyBooked ? "booked" : "reserved";
                statusColorClass = isFullyBooked 
                  ? "bg-destructive/10 text-destructive border border-destructive/20" 
                  : "bg-warning/10 text-warning border border-warning/20";
              }

              return (
                <div 
                  key={food.id}
                  className="bg-card rounded-[24px] p-4 shadow-sm border border-border/60 flex items-center justify-between gap-3 hover:border-primary-deep/30 transition-all cursor-pointer"
                  onClick={() => navigate(`/food/${food.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={food.image} 
                      alt={food.name} 
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                      onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80"; }}
                    />
                    <div className="min-w-0">
                      <p className="font-extrabold text-foreground text-sm truncate">{food.name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${statusColorClass}`}>
                          {statusText}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {remaining} / {food.feeds} left
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete "${food.name}"?`)) {
                          await removePost(food.id);
                          toast.success("Listing deleted successfully!");
                        }
                      }}
                      className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive hover:text-white text-destructive flex items-center justify-center transition-all"
                      title="Delete listing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

      {/* Sharing Metrics Section */}
      <div className="space-y-4 pt-2">
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
