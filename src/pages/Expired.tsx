import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAllFoods } from "@/hooks/useMyPosts";
import { Category, FoodItem } from "@/types/food";
import { getFoodTimes } from "@/lib/utils";
import Chip from "@/components/Chip";
import { RefreshCw, MapPin, Users, Star, ArrowLeft, Clock, Search } from "lucide-react";

const categories: Category[] = ["Veg", "Non-Veg", "Bakery", "Fried", "Sweets"];

// ─── Custom Grace Countdown for Expired Items ────────────────────────────────
function GraceCountdown({ secondaryExpiry }: { secondaryExpiry: number }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const diff = secondaryExpiry - now;
      if (diff <= 0) {
        setTimeLeft("Gone");
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (num: number) => num.toString().padStart(2, "0");
      setTimeLeft(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [secondaryExpiry]);

  return (
    <span className="font-mono tabular-nums tracking-tight text-urgent font-bold">
      ⏳ Gone in {timeLeft}
    </span>
  );
}

// ─── Custom Card for Expired Food Listings ──────────────────────────────────
function ExpiredFoodCard({ food }: { food: FoodItem }) {
  const { secondaryExpiry } = getFoodTimes(food);
  const isReserved = food.status === "reserved";
  const isCollected = food.status === "collected";

  const total = food.feeds;
  const booked = food.bookedPortions || 0;
  const remaining = Math.max(0, total - booked);
  const isFullyBooked = remaining <= 0;

  // Custom status configuration
  let statusText = food.status as string;
  let statusColorClass = "bg-success text-success-foreground";

  if (isCollected) {
    statusText = "collected";
    statusColorClass = "bg-muted-foreground/30 text-foreground";
  } else if (isReserved || isFullyBooked) {
    statusText = isFullyBooked ? "booked" : "reserved";
    statusColorClass = isFullyBooked ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground";
  } else {
    statusText = "available";
    statusColorClass = "bg-success text-success-foreground";
  }

  const purposeIcon = (p: string) => (p === "humans" ? "🧑 Humans" : p === "animals" ? "🐾 Animals" : "♻️ Both");

  return (
    <article className="card-soft border border-dashed border-warning/30 bg-card/95 hover:border-warning/60 transition-all duration-300 animate-fade-up">
      <Link to={isCollected ? "#" : `/food/${food.id}`} className={isCollected ? "pointer-events-none" : "block overflow-hidden"}>
        <div className="relative">
          <img 
            src={food.image} 
            alt={food.name} 
            className="w-full h-44 object-cover grayscale-[20%] opacity-90 hover:scale-105 transition-transform duration-300" 
            loading="lazy" 
          />
          <span className={`absolute top-3 right-3 badge-pill ${statusColorClass}`}>
            {statusText}
          </span>
          {food.purpose === "animals" && (
            <span className="absolute top-3 left-3 badge-pill bg-secondary text-secondary-foreground">
              🐾 Animal Priority
            </span>
          )}
        </div>
      </Link>

      <div className="p-4 space-y-3">
        <Link to={isCollected ? "#" : `/food/${food.id}`} className={isCollected ? "pointer-events-none" : "block hover:opacity-90 transition-opacity"}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-lg leading-tight text-foreground/90 truncate">{food.name}</h3>
              <div className="text-xs font-bold text-muted-foreground flex flex-col gap-1 mt-1">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Feeds {total} people</span>
                <span className="text-primary-deep flex items-center gap-1 font-extrabold">📊 {remaining} / {total} portions left</span>
              </div>
              {/* Portions Progress Bar */}
              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden border border-border/40 mt-1.5">
                <div 
                  className="bg-primary-deep h-full transition-all duration-500" 
                  style={{ width: `${(remaining / total) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-right shrink-0">
              {food.price === 0 ? (
                <span className="badge-pill bg-success text-success-foreground">FREE</span>
              ) : (
                <span className="font-extrabold text-lg text-foreground/80">₹{food.price}</span>
              )}
            </div>
          </div>
        </Link>



        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge-pill bg-urgent/10 text-urgent border border-urgent/20">
            <GraceCountdown secondaryExpiry={secondaryExpiry} />
          </span>
          <span className="badge-pill bg-accent text-accent-foreground">{purposeIcon(food.purpose)}</span>
          {food.safeForAnimals ? (
            <span className="badge-pill bg-primary text-primary-foreground">✔ Safe for animals</span>
          ) : (
            <span className="badge-pill bg-muted text-muted-foreground">⚠️ Not for animals</span>
          )}
        </div>

        <p className="text-sm text-muted-foreground flex items-start gap-1.5 line-clamp-2">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
          {food.address}
        </p>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {food.tags.map((t) => (
            <span key={t} className="chip chip-default !py-1">{t}</span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 fill-warning text-warning" />
            <span className="font-bold">{food.trustScore}</span>
            <span className="text-muted-foreground">·</span>
            <span className={`text-xs font-semibold ${food.confidence === "High" ? "text-success" : food.confidence === "Medium" ? "text-warning" : "text-destructive"}`}>
              {food.confidence}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm" title={food.provider.name}>
            {food.provider.avatar}
          </div>
        </div>

        <Link
          to={isCollected ? "#" : `/food/${food.id}`}
          className={`btn-primary block text-center bg-gradient-to-r from-warning to-amber-600 border-none text-white shadow-soft ${isCollected ? "pointer-events-none opacity-50" : ""}`}
        >
          {isCollected ? "Collected" : "Claim Expired Food"}
        </Link>
      </div>
    </article>
  );
}

// ─── Main Expired Component ──────────────────────────────────────────────────
export default function Expired() {
  const { foods: dbFoods, loading, refresh } = useAllFoods();
  const [activeCats, setActiveCats] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const toggleCat = (c: Category) =>
    setActiveCats((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const list = useMemo(() => {
    let arr = [...dbFoods];
    const now = Date.now();

    // Show only items that are in the 3-hour grace period
    arr = arr.filter((f) => {
      const { primaryExpiry, secondaryExpiry } = getFoodTimes(f);
      return now >= primaryExpiry && now < secondaryExpiry;
    });

    // Apply category filters
    if (activeCats.length) {
      arr = arr.filter((f) => activeCats.includes(f.category));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      arr = arr.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.address.toLowerCase().includes(query) ||
          f.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    return arr;
  }, [activeCats, searchQuery, dbFoods]);

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:bg-muted transition-all"
            title="Back to Feed"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-1.5">
              Expired Outlet
            </h1>
            <p className="text-xs text-muted-foreground">Still safe and requestable for 3 more hours.</p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:bg-muted transition-all"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl flex gap-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
        <Clock className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <span className="font-extrabold">💡 Sustainability Spotlight:</span> Even when primary freshness ends, these items remain fully requestable for pets, composting, or quick consumption for another 3 hours before they hard expire.
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search expired items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {categories.map((c) => (
            <Chip key={c} label={c} active={activeCats.includes(c)} onClick={() => toggleCat(c)} />
          ))}
        </div>
      </div>

      {/* Listings list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="card-soft animate-pulse">
              <div className="w-full h-44 bg-muted rounded-t-2xl" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-muted rounded-xl w-2/3" />
                <div className="h-4 bg-muted rounded-xl w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((f) => (
            <ExpiredFoodCard key={f.id} food={f} />
          ))}
          {list.length === 0 && (
            <div className="text-center py-16 bg-card rounded-3xl border border-dashed border-border/80 space-y-3">
              <p className="text-5xl">🎉</p>
              <h3 className="font-extrabold text-foreground text-base">Zero Food Expired!</h3>
              <p className="text-xs text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
                All food listings were saved before they reached expiration. Fantastic work, team! 💚
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
