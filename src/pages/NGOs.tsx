import { useEffect, useState, useMemo } from "react";
import { MapPin, Navigation, Phone, ExternalLink, Heart } from "lucide-react";
import { openInGoogleMaps } from "@/components/MapPreview";
import Chip from "@/components/Chip";
import { useNavigate } from "react-router-dom";

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

// Expanded NGO list covering major Indian cities including Chennai
const ngosList: NGO[] = [
  // Chennai
  { id: "c1", name: "Akshaya Trust", address: "Besant Nagar, Chennai", lat: 13.0005, lng: 80.2707, phone: "9444014974", types: ["Humans"], description: "Feeds thousands of Chennai's hungry daily" },
  { id: "c2", name: "Siragu Montessori School Trust", address: "Kodambakkam, Chennai", lat: 13.0514, lng: 80.2178, phone: "9382109999", types: ["Humans"], description: "Supports underprivileged children with meals" },
  { id: "c3", name: "Blue Cross of India", address: "Guindy, Chennai", lat: 13.0072, lng: 80.2209, phone: "04422354959", types: ["Animals"], description: "Animal rescue and care across Tamil Nadu" },
  { id: "c4", name: "Chennai Animal Action Group", address: "Anna Nagar, Chennai", lat: 13.0850, lng: 80.2101, phone: "9840047474", types: ["Animals"], description: "Rescues and rehabilitates street animals" },
  { id: "c5", name: "Reach India", address: "T. Nagar, Chennai", lat: 13.0418, lng: 80.2341, phone: "9841234567", types: ["Humans", "Animals"], description: "Community outreach for humans and animals" },
  { id: "c6", name: "Exnora International", address: "Nungambakkam, Chennai", lat: 13.0582, lng: 80.2427, phone: "9380123456", types: ["Humans"], description: "Waste reduction and food redistribution" },
  // Bangalore
  { id: "b1", name: "Helping Hands Foundation", address: "Koramangala, Bangalore", lat: 12.9279, lng: 77.6271, phone: "9876543210", types: ["Humans"] },
  { id: "b2", name: "Paws Rescue", address: "Indiranagar, Bangalore", lat: 12.9784, lng: 77.6408, phone: "9876543211", types: ["Animals"] },
  { id: "b3", name: "City Food Bank", address: "Jayanagar, Bangalore", lat: 12.9299, lng: 77.5826, phone: "9876543212", types: ["Humans", "Animals"] },
  // Delhi
  { id: "d1", name: "Delhi Animal Shelter", address: "Hauz Khas, New Delhi", lat: 28.5494, lng: 77.2001, phone: "9876543214", types: ["Animals"] },
  { id: "d2", name: "Roti Bank Delhi", address: "Connaught Place, New Delhi", lat: 28.6315, lng: 77.2167, phone: "9810012345", types: ["Humans"], description: "Free meals for the homeless" },
  // Mumbai
  { id: "m1", name: "The Robin Hood Army", address: "Bandra, Mumbai", lat: 19.0596, lng: 72.8295, phone: "9820012345", types: ["Humans"], description: "Zero-waste food rescue network" },
  { id: "m2", name: "Welfare of Stray Dogs", address: "Matunga, Mumbai", lat: 19.0210, lng: 72.8447, phone: "9820023456", types: ["Animals"] },
  // Kolkata
  { id: "k1", name: "Hope Foundation Kolkata", address: "Salt Lake, Kolkata", lat: 22.5866, lng: 88.4063, phone: "9876543213", types: ["Humans"] },
  // Hyderabad
  { id: "h1", name: "Sarv Seva Samithi", address: "Secunderabad, Hyderabad", lat: 17.4401, lng: 78.4985, phone: "9848012345", types: ["Humans", "Animals"] },
];

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

type FilterType = "All" | "Humans" | "Animals";

export default function NGOs() {
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState("");
  const [locLoading, setLocLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("All");
  const nav = useNavigate();

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocLoading(false);
        },
        () => {
          setLocError("Location access denied. Showing all NGOs.");
          setLocLoading(false);
        }
      );
    } else {
      setLocLoading(false);
    }
  }, []);

  const nearbyNGOs = useMemo(() => {
    let list = ngosList;

    if (filter !== "All") {
      list = list.filter((ngo) => ngo.types.includes(filter));
    }

    if (!userLoc) return list;

    return list
      .map((ngo) => ({
        ...ngo,
        distance: calculateDistance(userLoc.lat, userLoc.lng, ngo.lat, ngo.lng),
      }))
      .filter((ngo) => ngo.distance <= 50)
      .sort((a, b) => a.distance - b.distance);
  }, [userLoc, filter]);

  return (
    <div className="px-4 py-5 space-y-5 pb-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Nearby NGOs</h1>
        <p className="text-sm text-muted-foreground">
          Donate directly to verified organizations within 50 km.
        </p>
      </div>

      {/* Location status */}
      {locLoading && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 p-2 rounded-xl">
          <MapPin className="w-4 h-4 animate-pulse" /> Detecting your location…
        </div>
      )}
      {!locLoading && userLoc && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-deep bg-primary/10 p-2 rounded-xl">
          <MapPin className="w-4 h-4" /> Showing NGOs within 50 km of your location
        </div>
      )}
      {!locLoading && locError && (
        <div className="text-xs font-semibold text-warning bg-warning/10 p-2 rounded-xl">
          {locError}
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2">
        {(["All", "Humans", "Animals"] as FilterType[]).map((f) => (
          <Chip key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />
        ))}
      </div>

      <div className="space-y-4">
        {nearbyNGOs.map((ngo) => {
          const dist = "distance" in ngo ? (ngo as any).distance : null;
          return (
            <article key={ngo.id} className="card-soft animate-fade-up p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-lg leading-tight text-foreground truncate">
                    {ngo.name}
                  </h3>
                  {ngo.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{ngo.description}</p>
                  )}
                </div>
                {dist !== null && (
                  <span className="badge-pill bg-muted text-muted-foreground shrink-0">
                    {dist.toFixed(1)} km
                  </span>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                {ngo.types.map((t) => (
                  <Chip key={t} label={t} active={false} onClick={() => { }} />
                ))}
              </div>

              <p className="text-sm text-muted-foreground flex items-start gap-1.5 line-clamp-2">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                {ngo.address}
              </p>

              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Phone className="w-4 h-4 shrink-0 text-primary-deep" />
                <a
                  href={`tel:${ngo.phone}`}
                  className="text-primary-deep hover:underline"
                >
                  {ngo.phone}
                </a>
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => openInGoogleMaps(ngo.lat, ngo.lng)}
                  className="flex-1 py-2.5 rounded-xl bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-muted/70 transition-all"
                >
                  <Navigation className="w-4 h-4" /> Directions
                </button>
                <button
                  onClick={() => nav("/post")}
                  className="flex-[2] py-2.5 rounded-xl bg-primary-deep text-primary-deep-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-soft"
                >
                  <Heart className="w-4 h-4" /> Donate Food
                </button>
              </div>
            </article>
          );
        })}

        {!locLoading && nearbyNGOs.length === 0 && (
          <div className="text-center py-14 space-y-2">
            <p className="text-4xl">🏢</p>
            <p className="font-bold text-foreground">No NGOs found nearby</p>
            <p className="text-sm text-muted-foreground">
              {userLoc
                ? "No registered NGOs within 50 km. Try allowing location or check back later."
                : "Enable location to find NGOs near you."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}