import { useEffect, useMemo, useState } from "react";
import FoodCard from "@/components/FoodCard";
import Chip from "@/components/Chip";
import { Category } from "@/types/food";
import { Flame, Award, MapPin, RefreshCw } from "lucide-react";
import { useAllFoods } from "@/hooks/useMyPosts";
import { useTransactions } from "@/hooks/useTransactions";

const categories: Category[] = ["Veg", "Non-Veg", "Bakery", "Fried", "Sweets"];
const sorts = ["Newest", "Expiry Soon", "Quantity High", "Price Low"] as const;

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
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

export default function Home() {
  const [activeCats, setActiveCats] = useState<Category[]>([]);
  const [sort, setSort] = useState<(typeof sorts)[number]>("Newest");
  const { foods: dbFoods, loading, refresh } = useAllFoods();
  const { userStats } = useTransactions();
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState("");
  const [locLoading, setLocLoading] = useState(true);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocLoading(false);
        },
        () => {
          setLocError("Location access denied. Showing all available food.");
          setLocLoading(false);
        }
      );
    } else {
      setLocLoading(false);
    }
  }, []);

  const toggleCat = (c: Category) =>
    setActiveCats((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  const list = useMemo(() => {
    let arr = [...dbFoods];

    // Auto filter by 50km if location is available
    if (userLoc) {
      arr = arr.filter(
        (f) =>
          f.lat &&
          f.lng &&
          calculateDistance(userLoc.lat, userLoc.lng, f.lat, f.lng) <= 50
      );
    }

    if (activeCats.length) arr = arr.filter((f) => activeCats.includes(f.category));

    switch (sort) {
      case "Expiry Soon":
        arr.sort((a, b) => a.expiryHours - b.expiryHours);
        break;
      case "Quantity High":
        arr.sort((a, b) => b.feeds - a.feeds);
        break;
      case "Price Low":
        arr.sort((a, b) => a.price - b.price);
        break;
      default:
        // Newest — already ordered by DB
        break;
    }
    return arr;
  }, [activeCats, sort, dbFoods, userLoc]);

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Available Food</h1>
          <p className="text-sm text-muted-foreground">Rescue meals near you, today.</p>
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

      <div className="bg-hero p-4 rounded-2xl flex items-center justify-between shadow-soft">
        <div className="flex items-center gap-3">
          <Flame className="w-6 h-6 text-urgent" />
          <div>
            <p className="font-extrabold text-foreground">
              {userStats.postsMade > 0 ? `${userStats.postsMade} Posts Made` : "Start Sharing Food"}
            </p>
            <p className="text-xs text-muted-foreground">Keep saving food!</p>
          </div>
        </div>
        <Award className="w-6 h-6 text-primary-deep" />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-bold text-muted-foreground uppercase shrink-0">Sort:</label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="flex-1 px-3 py-2 rounded-xl bg-card border border-border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {sorts.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {locLoading && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 p-2 rounded-xl">
          <MapPin className="w-4 h-4 animate-pulse" /> Detecting your location…
        </div>
      )}
      {!locLoading && userLoc && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-deep bg-primary/10 p-2 rounded-xl">
          <MapPin className="w-4 h-4" /> Showing items within 50 km of your location
        </div>
      )}
      {!locLoading && locError && (
        <div className="text-xs font-semibold text-warning bg-warning/10 p-2 rounded-xl">
          {locError}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {categories.map((c) => (
          <Chip key={c} label={c} active={activeCats.includes(c)} onClick={() => toggleCat(c)} />
        ))}
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-soft animate-pulse">
              <div className="w-full h-44 bg-muted rounded-t-2xl" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-muted rounded-xl w-2/3" />
                <div className="h-4 bg-muted rounded-xl w-1/2" />
                <div className="h-4 bg-muted rounded-xl w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          {list.map((f) => (
            <FoodCard key={f.id} food={f} />
          ))}
          {list.length === 0 && (
            <div className="text-center py-14 space-y-2">
              <p className="text-4xl">🍱</p>
              <p className="font-bold text-foreground">No food listings found</p>
              <p className="text-sm text-muted-foreground">
                {userLoc
                  ? "No available food within 50 km. Check back soon!"
                  : "No items match your filters."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}