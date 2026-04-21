import { FoodItem } from "@/types/food";
import { Link } from "react-router-dom";
import { MapPin, Users, AlertTriangle, Star, Navigation } from "lucide-react";
import MapPreview, { openInGoogleMaps } from "./MapPreview";
import LiveCountdown from "./LiveCountdown";

const purposeIcon = (p: string) => (p === "humans" ? "🧑 Humans" : p === "animals" ? "🐾 Animals" : "♻️ Both");

const statusStyles: Record<string, string> = {
  available: "bg-success text-success-foreground",
  reserved: "bg-warning text-warning-foreground",
  collected: "bg-muted-foreground/30 text-foreground",
};

export default function FoodCard({ food }: { food: FoodItem }) {
  const isUrgent = food.expiryHours < 1;
  const isReserved = food.status === "reserved";
  const isCollected = food.status === "collected";

  return (
    <article className="card-soft animate-fade-up">
      <div className="relative">
        <img src={food.image} alt={food.name} className="w-full h-44 object-cover" loading="lazy" />
        <span className={`absolute top-3 right-3 badge-pill ${statusStyles[food.status]}`}>
          {food.status}
        </span>
        {food.purpose === "animals" && (
          <span className="absolute top-3 left-3 badge-pill bg-secondary text-secondary-foreground">
            🐾 Animal Priority
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-lg leading-tight text-foreground">{food.name}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Users className="w-3.5 h-3.5" /> Feeds ~{food.feeds} people
            </p>
          </div>
          <div className="text-right">
            {food.price === 0 ? (
              <span className="badge-pill bg-success text-success-foreground">FREE</span>
            ) : (
              <span className="font-extrabold text-lg text-foreground">₹{food.price}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge-pill ${isUrgent ? 'bg-urgent text-urgent-foreground animate-pulse-soft' : 'bg-muted text-muted-foreground'}`}>
            <LiveCountdown postedAt={food.postedAt} expiryHours={food.expiryHours} urgent={isUrgent} />
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

        <MapPreview lat={food.lat} lng={food.lng} label={food.name} />

        <button
          onClick={() => openInGoogleMaps(food.lat, food.lng)}
          className="w-full py-2 rounded-xl bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-muted/70 transition-all"
        >
          <Navigation className="w-4 h-4" /> Open in Maps
        </button>

        <div className="flex flex-wrap gap-1.5">
          {food.tags.map((t) => (
            <span key={t} className="chip chip-default !py-1">{t}</span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 fill-warning text-warning" />
            <span className="font-bold">{food.trustScore}</span>
            <span className="text-muted-foreground">·</span>
            <span className={`text-xs font-semibold ${food.confidence === "High" ? "text-success" : food.confidence === "Medium" ? "text-warning" : "text-destructive"}`}>
              {food.confidence}
            </span>
          </div>
          {food.provider.reliability === "low" && (
            <span className="text-[10px] text-destructive font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Low reliability
            </span>
          )}
        </div>

        {isReserved && (
          <div className="bg-warning/20 text-warning-foreground p-2 rounded-xl text-xs font-semibold text-center">
            ⚠️ Already Reserved
          </div>
        )}

        <Link
          to={isReserved || isCollected ? "#" : `/food/${food.id}`}
          className={`btn-primary block text-center ${isReserved || isCollected ? "pointer-events-none opacity-50" : ""}`}
        >
          {isReserved ? "Reserved" : isCollected ? "Collected" : "View Details"}
        </Link>
      </div>
    </article>
  );
}
