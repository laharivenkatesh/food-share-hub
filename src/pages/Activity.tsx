import { useState } from "react";
import { myPosts, myClaims } from "@/data/mockFoods";
import { FoodItem } from "@/types/food";
import { MapPin, Clock, Award, Flame } from "lucide-react";
import { Link } from "react-router-dom";

const statusStyles: Record<string, string> = {
  available: "bg-success text-success-foreground",
  reserved: "bg-warning text-warning-foreground",
  collected: "bg-muted-foreground/30 text-foreground",
};

export default function Activity() {
  const [tab, setTab] = useState<"posts" | "claims">("posts");
  const list = tab === "posts" ? myPosts : myClaims;

  return (
    <div className="px-4 py-5 space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">My Activity</h1>

      {/* Badges & streak */}
      <div className="card-soft p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-urgent" />
            <span className="font-extrabold">5 Day Streak</span>
          </div>
          <span className="text-xs text-muted-foreground">Trust ⭐ 4.7</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["Consistent Provider", "Food Saver", "Quick Rescuer"].map((b) => (
            <span key={b} className="badge-pill bg-primary text-primary-foreground"><Award className="w-3 h-3" /> {b}</span>
          ))}
        </div>
      </div>

      <div className="flex bg-muted rounded-2xl p-1">
        {(["posts", "claims"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
              tab === t ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"
            }`}
          >
            My {t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.map((f) => <ActivityCard key={f.id} food={f} />)}
        {list.length === 0 && <p className="text-center text-muted-foreground py-8">Nothing here yet.</p>}
      </div>
    </div>
  );
}

function ActivityCard({ food }: { food: FoodItem }) {
  return (
    <Link to={`/food/${food.id}`} className="card-soft flex p-3 gap-3 hover:scale-[1.01] transition-transform">
      <img src={food.image} alt={food.name} className="w-20 h-20 rounded-xl object-cover" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-extrabold truncate">{food.name}</h3>
          <span className={`badge-pill ${statusStyles[food.status]}`}>{food.status}</span>
        </div>
        <p className="text-sm font-bold text-foreground">
          {food.price === 0 ? <span className="text-success">FREE</span> : `₹${food.price}`}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
          <MapPin className="w-3 h-3" /> {food.address}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" /> Expires in {food.expiryHours}h
        </p>
      </div>
    </Link>
  );
}
