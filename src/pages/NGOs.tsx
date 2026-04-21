import { useEffect, useState, useMemo } from "react";
import { MapPin, Navigation, Phone, ExternalLink } from "lucide-react";
import { openInGoogleMaps } from "@/components/MapPreview";
import Chip from "@/components/Chip";

interface NGO {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  types: string[];
}

const ngosList: NGO[] = [
  { id: "1", name: "Helping Hands Foundation", address: "Koramangala, Bangalore", lat: 12.9279, lng: 77.6271, phone: "9876543210", types: ["Humans"] },
  { id: "2", name: "Paws Rescue", address: "Indiranagar, Bangalore", lat: 12.9784, lng: 77.6408, phone: "9876543211", types: ["Animals"] },
  { id: "3", name: "City Food Bank", address: "Jayanagar, Bangalore", lat: 12.9299, lng: 77.5826, phone: "9876543212", types: ["Humans", "Animals"] },
  { id: "4", name: "Hope Foundation Kolkata", address: "Salt Lake, Kolkata", lat: 22.5866, lng: 88.4063, phone: "9876543213", types: ["Humans"] },
  { id: "5", name: "Delhi Animal Shelter", address: "Hauz Khas, New Delhi", lat: 28.5494, lng: 77.2001, phone: "9876543214", types: ["Animals"] },
];

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function NGOs() {
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const [locError, setLocError] = useState("");

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocError("Location access denied. Showing all NGOs.")
      );
    }
  }, []);

  const nearbyNGOs = useMemo(() => {
    if (!userLoc) return ngosList;
    return ngosList
      .map(ngo => ({ ...ngo, distance: calculateDistance(userLoc.lat, userLoc.lng, ngo.lat, ngo.lng) }))
      .filter(ngo => ngo.distance <= 50)
      .sort((a, b) => a.distance - b.distance);
  }, [userLoc]);

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Nearby NGOs</h1>
        <p className="text-sm text-muted-foreground">Donate directly to verified organizations within 50km.</p>
      </div>

      {userLoc && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-deep bg-primary/10 p-2 rounded-xl">
          <MapPin className="w-4 h-4" /> Showing NGOs within 50km
        </div>
      )}
      {locError && (
        <div className="text-xs font-semibold text-warning bg-warning/10 p-2 rounded-xl">
          {locError}
        </div>
      )}

      <div className="space-y-4">
        {nearbyNGOs.map((ngo) => (
          <article key={ngo.id} className="card-soft animate-fade-up p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-extrabold text-lg leading-tight text-foreground">{ngo.name}</h3>
              {ngo.distance !== undefined && (
                <span className="badge-pill bg-muted text-muted-foreground shrink-0">
                  {ngo.distance.toFixed(1)} km
                </span>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              {ngo.types.map(t => <Chip key={t} label={t} active={false} onClick={()=>{}} />)}
            </div>

            <p className="text-sm text-muted-foreground flex items-start gap-1.5 line-clamp-2">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
              {ngo.address}
            </p>
            
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Phone className="w-4 h-4 shrink-0 text-primary-deep" />
              <a href={`tel:${ngo.phone}`} className="text-primary-deep hover:underline">{ngo.phone}</a>
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => openInGoogleMaps(ngo.lat, ngo.lng)}
                className="flex-1 py-2 rounded-xl bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-muted/70 transition-all"
              >
                <Navigation className="w-4 h-4" /> Map
              </button>
              <button
                onClick={() => window.location.href = '/post'}
                className="flex-[2] py-2 rounded-xl bg-primary-deep text-primary-deep-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-soft"
              >
                Donate Food <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </article>
        ))}

        {nearbyNGOs.length === 0 && (
          <p className="text-center text-muted-foreground py-10">No NGOs found near your location.</p>
        )}
      </div>
    </div>
  );
}
