import { useEffect, useMemo, useState, useCallback } from "react";
import FoodCard from "@/components/FoodCard";
import Chip from "@/components/Chip";
import { Category } from "@/types/food";
import { Flame, Award, MapPin, RefreshCw, Navigation, Phone, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { useAllFoods } from "@/hooks/useMyPosts";
import { useTransactions } from "@/hooks/useTransactions";
import { openInGoogleMaps } from "@/components/MapPreview";
import { useNavigate } from "react-router-dom";

const categories: Category[] = ["Veg", "Non-Veg", "Bakery", "Fried", "Sweets"];
const sorts = ["Newest", "Expiry Soon", "Quantity High", "Price Low"] as const;

// ─── NGO data ─────────────────────────────────────────────────────────────────
interface NGO {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  types: string[];
  description?: string;
}

const ngosList: NGO[] = [
  { id: "c1", name: "Akshaya Trust", address: "Besant Nagar, Chennai", lat: 13.0005, lng: 80.2707, phone: "9444014974", types: ["Humans"], description: "Feeds thousands of Chennai's hungry daily" },
  { id: "c2", name: "Siragu Montessori School Trust", address: "Kodambakkam, Chennai", lat: 13.0514, lng: 80.2178, phone: "9382109999", types: ["Humans"], description: "Supports underprivileged children with meals" },
  { id: "c3", name: "Blue Cross of India", address: "Guindy, Chennai", lat: 13.0072, lng: 80.2209, phone: "04422354959", types: ["Animals"], description: "Animal rescue and care across Tamil Nadu" },
  { id: "c4", name: "Chennai Animal Action Group", address: "Anna Nagar, Chennai", lat: 13.0850, lng: 80.2101, phone: "9840047474", types: ["Animals"], description: "Rescues and rehabilitates street animals" },
  { id: "c5", name: "Reach India", address: "T. Nagar, Chennai", lat: 13.0418, lng: 80.2341, phone: "9841234567", types: ["Humans", "Animals"], description: "Community outreach for humans and animals" },
  { id: "c6", name: "Exnora International", address: "Nungambakkam, Chennai", lat: 13.0582, lng: 80.2427, phone: "9380123456", types: ["Humans"], description: "Waste reduction and food redistribution" },
  { id: "b1", name: "Helping Hands Foundation", address: "Koramangala, Bangalore", lat: 12.9279, lng: 77.6271, phone: "9876543210", types: ["Humans"] },
  { id: "b2", name: "Paws Rescue", address: "Indiranagar, Bangalore", lat: 12.9784, lng: 77.6408, phone: "9876543211", types: ["Animals"] },
  { id: "b3", name: "City Food Bank", address: "Jayanagar, Bangalore", lat: 12.9299, lng: 77.5826, phone: "9876543212", types: ["Humans", "Animals"] },
  { id: "d1", name: "Delhi Animal Shelter", address: "Hauz Khas, New Delhi", lat: 28.5494, lng: 77.2001, phone: "9876543214", types: ["Animals"] },
  { id: "d2", name: "Roti Bank Delhi", address: "Connaught Place, New Delhi", lat: 28.6315, lng: 77.2167, phone: "9810012345", types: ["Humans"], description: "Free meals for the homeless" },
  { id: "m1", name: "The Robin Hood Army", address: "Bandra, Mumbai", lat: 19.0596, lng: 72.8295, phone: "9820012345", types: ["Humans"], description: "Zero-waste food rescue network" },
  { id: "m2", name: "Welfare of Stray Dogs", address: "Matunga, Mumbai", lat: 19.0210, lng: 72.8447, phone: "9820023456", types: ["Animals"] },
  { id: "k1", name: "Hope Foundation Kolkata", address: "Salt Lake, Kolkata", lat: 22.5866, lng: 88.4063, phone: "9876543213", types: ["Humans"] },
  { id: "h1", name: "Sarv Seva Samithi", address: "Secunderabad, Hyderabad", lat: 17.4401, lng: 78.4985, phone: "9848012345", types: ["Humans", "Animals"] },
];

// ─── Utils ────────────────────────────────────────────────────────────────────
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

// ─── NGO Card ─────────────────────────────────────────────────────────────────
function NGOCard({ ngo, distance, onDonate }: { ngo: NGO; distance: number | null; onDonate: () => void }) {
  return (
    <article className="card-soft animate-fade-up p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-base leading-tight text-foreground truncate">{ngo.name}</h3>
          {ngo.description && <p className="text-xs text-muted-foreground mt-0.5">{ngo.description}</p>}
        </div>
        {distance !== null && (
          <span className="badge-pill bg-muted text-muted-foreground shrink-0">{distance.toFixed(1)} km</span>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {ngo.types.map((t) => (
          <span key={t} className="chip chip-default !py-0.5 !text-xs">{t}</span>
        ))}
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        {ngo.address}
      </p>

      <p className="text-sm font-semibold flex items-center gap-1.5">
        <Phone className="w-4 h-4 shrink-0 text-primary-deep" />
        <a href={`tel:${ngo.phone}`} className="text-primary-deep hover:underline">{ngo.phone}</a>
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => openInGoogleMaps(ngo.lat, ngo.lng)}
          className="flex-1 py-2 rounded-xl bg-muted text-foreground font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-muted/70 transition-all"
        >
          <Navigation className="w-3.5 h-3.5" /> Directions
        </button>
        <button
          onClick={onDonate}
          className="flex-[2] py-2 rounded-xl bg-primary-deep text-primary-deep-foreground font-semibold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all shadow-soft"
        >
          <Heart className="w-3.5 h-3.5" /> Donate Food
        </button>
      </div>
    </article>
  );
}

// ─── Main Home ────────────────────────────────────────────────────────────────
export default function Home() {
  const [activeCats, setActiveCats] = useState<Category[]>([]);
  const [sort, setSort] = useState<(typeof sorts)[number]>("Newest");
  const { foods: dbFoods, loading, refresh } = useAllFoods();
  const { userStats } = useTransactions();
  const nav = useNavigate();

  // Location state — no localStorage, purely in-memory
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState("");
  const [locLoading, setLocLoading] = useState(false);
  const [locGranted, setLocGranted] = useState(false);

  // NGO section state
  const [showNGOs, setShowNGOs] = useState(false);
  const [ngoFilter, setNgoFilter] = useState<"All" | "Humans" | "Animals">("All");

  // Request location only when user explicitly clicks the button
  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocError("Geolocation not supported by your browser.");
      return;
    }
    setLocLoading(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocGranted(true);
        setLocLoading(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocError("Location permission denied. Please allow location access in your browser settings, then try again.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocError("Location unavailable. Showing all food.");
        } else {
          setLocError("Location request timed out. Showing all food.");
        }
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const toggleCat = (c: Category) =>
    setActiveCats((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const list = useMemo(() => {
    let arr = [...dbFoods];
    if (userLoc) {
      arr = arr.filter(
        (f) => f.lat && f.lng && calculateDistance(userLoc.lat, userLoc.lng, f.lat, f.lng) <= 50
      );
    }
    if (activeCats.length) arr = arr.filter((f) => activeCats.includes(f.category));
    switch (sort) {
      case "Expiry Soon": arr.sort((a, b) => a.expiryHours - b.expiryHours); break;
      case "Quantity High": arr.sort((a, b) => b.feeds - a.feeds); break;
      case "Price Low": arr.sort((a, b) => a.price - b.price); break;
    }
    return arr;
  }, [activeCats, sort, dbFoods, userLoc]);

  const nearbyNGOs = useMemo(() => {
    let filtered = ngosList;
    if (ngoFilter !== "All") filtered = filtered.filter((n) => n.types.includes(ngoFilter));
    if (!userLoc) return filtered.map((n) => ({ ...n, distance: null as number | null }));
    return filtered
      .map((n) => ({ ...n, distance: calculateDistance(userLoc.lat, userLoc.lng, n.lat, n.lng) }))
      .filter((n) => n.distance <= 50)
      .sort((a, b) => a.distance - b.distance);
  }, [userLoc, ngoFilter]);

  return (
    <div className="px-4 py-5 space-y-5">

      {/* Header */}
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

      {/* Stats banner */}
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

      {/* Location section */}
      <div className="space-y-2">
        {!locGranted && !locLoading && !locError && (
          <button
            onClick={requestLocation}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary-deep text-primary-deep font-semibold text-sm hover:bg-primary/5 transition-all"
          >
            <MapPin className="w-4 h-4" /> Use My Location (within 50 km)
          </button>
        )}
        {locLoading && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 p-2.5 rounded-xl">
            <MapPin className="w-4 h-4 animate-pulse" /> Detecting your location…
          </div>
        )}
        {locGranted && userLoc && (
          <div className="flex items-center justify-between text-xs font-semibold text-primary-deep bg-primary/10 px-3 py-2 rounded-xl">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Showing items within 50 km</span>
            <button
              onClick={() => { setUserLoc(null); setLocGranted(false); setLocError(""); }}
              className="text-muted-foreground hover:text-destructive transition-colors text-xs"
            >
              Clear
            </button>
          </div>
        )}
        {locError && (
          <div className="text-xs font-semibold text-warning bg-warning/10 p-2.5 rounded-xl">
            {locError}
          </div>
        )}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-bold text-muted-foreground uppercase shrink-0">Sort:</label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="flex-1 px-3 py-2 rounded-xl bg-card border border-border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {sorts.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {categories.map((c) => (
          <Chip key={c} label={c} active={activeCats.includes(c)} onClick={() => toggleCat(c)} />
        ))}
      </div>

      {/* Food list */}
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
          {list.map((f) => <FoodCard key={f.id} food={f} />)}
          {list.length === 0 && (
            <div className="text-center py-14 space-y-2">
              <p className="text-4xl">🍱</p>
              <p className="font-bold text-foreground">No food listings found</p>
              <p className="text-sm text-muted-foreground">
                {userLoc ? "No available food within 50 km. Check back soon!" : "No items match your filters."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── NGO Section (inline, collapsible) ───────────────────────────────── */}
      <div className="border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowNGOs((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/50 transition-all"
        >
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary-deep" />
            <span className="font-extrabold text-base">Nearby NGOs</span>
            <span className="badge-pill bg-primary text-primary-foreground text-xs">
              {nearbyNGOs.length}
            </span>
          </div>
          {showNGOs ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showNGOs && (
          <div className="px-4 pb-4 space-y-4 bg-background">
            <p className="text-xs text-muted-foreground pt-2">
              {userLoc ? "Showing NGOs within 50 km of your location." : "Enable location to see NGOs near you, or browse all below."}
            </p>

            {/* Filter chips */}
            <div className="flex gap-2">
              {(["All", "Humans", "Animals"] as const).map((f) => (
                <Chip key={f} label={f} active={ngoFilter === f} onClick={() => setNgoFilter(f)} />
              ))}
            </div>

            {nearbyNGOs.length === 0 ? (
              <div className="text-center py-8 space-y-1">
                <p className="text-3xl">🏢</p>
                <p className="font-bold text-sm">No NGOs found nearby</p>
                <p className="text-xs text-muted-foreground">Enable location or try a different filter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {nearbyNGOs.map((ngo) => (
                  <NGOCard
                    key={ngo.id}
                    ngo={ngo}
                    distance={ngo.distance}
                    onDonate={() => nav("/post")}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}