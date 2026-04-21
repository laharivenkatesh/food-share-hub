import { useMemo, useState } from "react";
import { mockFoods } from "@/data/mockFoods";
import FoodCard from "@/components/FoodCard";
import Chip from "@/components/Chip";
import { Category } from "@/types/food";
import { Flame, Award } from "lucide-react";

const categories: Category[] = ["Veg", "Non-Veg", "Bakery", "Fried", "Sweets"];
const sorts = ["Newest", "Expiry Soon", "Quantity High", "Price Low"] as const;

export default function Home() {
  const [activeCats, setActiveCats] = useState<Category[]>([]);
  const [sort, setSort] = useState<(typeof sorts)[number]>("Newest");

  const toggleCat = (c: Category) =>
    setActiveCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const list = useMemo(() => {
    let arr = [...mockFoods];
    if (activeCats.length) arr = arr.filter((f) => activeCats.includes(f.category));
    switch (sort) {
      case "Expiry Soon": arr.sort((a,b) => a.expiryHours - b.expiryHours); break;
      case "Quantity High": arr.sort((a,b) => b.feeds - a.feeds); break;
      case "Price Low": arr.sort((a,b) => a.price - b.price); break;
    }
    return arr;
  }, [activeCats, sort]);

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Available Food</h1>
        <p className="text-sm text-muted-foreground">Rescue meals near you, today.</p>
      </div>

      {/* Streak banner */}
      <div className="bg-hero p-4 rounded-2xl flex items-center justify-between shadow-soft">
        <div className="flex items-center gap-3">
          <Flame className="w-6 h-6 text-urgent" />
          <div>
            <p className="font-extrabold text-foreground">5 Day Streak</p>
            <p className="text-xs text-muted-foreground">Keep saving food!</p>
          </div>
        </div>
        <Award className="w-6 h-6 text-primary-deep" />
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-bold text-muted-foreground uppercase">Sort:</label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="flex-1 px-3 py-2 rounded-xl bg-card border border-border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {sorts.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {categories.map((c) => (
          <Chip key={c} label={c} active={activeCats.includes(c)} onClick={() => toggleCat(c)} />
        ))}
      </div>

      <div className="space-y-4">
        {list.map((f) => <FoodCard key={f.id} food={f} />)}
        {list.length === 0 && <p className="text-center text-muted-foreground py-10">No items match your filters.</p>}
      </div>
    </div>
  );
}
