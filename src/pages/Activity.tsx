import { Settings, Leaf } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useTransactions";

export default function Activity() {
  const { profile } = useAuth();
  const { userStats } = useTransactions();

  return (
    <div className="px-5 py-6 space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-3xl font-extrabold font-serif tracking-tight text-foreground">Profile</h1>
        <button className="w-10 h-10 rounded-full bg-card flex items-center justify-center shadow-sm">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-primary rounded-[32px] p-5 relative overflow-hidden shadow-soft">
        <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="w-16 h-16 rounded-[20px] bg-card flex items-center justify-center shadow-sm shrink-0">
            <Leaf className="w-8 h-8 text-primary-deep" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary-foreground">{profile?.name ?? "Guest"}</h2>
            <p className="text-sm text-primary-foreground/80 font-semibold mt-0.5 flex items-center gap-1">
              {profile?.role ?? "User"} <span className="text-xs">•</span> <span><span className="text-amber-500">⭐️</span> 5.0 Trust Score</span>
            </p>
          </div>
        </div>

        <div className="bg-card/90 backdrop-blur-md rounded-[20px] py-3 px-4 flex items-center justify-between shadow-sm relative z-10">
          <div className="flex items-center gap-2 font-bold text-sm text-foreground">
            <span>🔥</span> 1 Day Streak
          </div>
          <span className="text-xs text-muted-foreground font-bold">Keep it going!</span>
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
      <div className="space-y-4 pt-2">
        <h3 className="text-xl font-extrabold font-serif text-foreground">Badges</h3>
        <div className="flex flex-wrap gap-2.5">
          {userStats.badges.length > 0 ? (
            userStats.badges.map(b => (
              <Badge key={b.text} icon={b.icon} text={b.text} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground font-bold">Complete transactions to earn badges!</p>
          )}
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
