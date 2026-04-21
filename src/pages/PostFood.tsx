import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera } from "lucide-react";
import Chip from "@/components/Chip";
import { Category, Purpose } from "@/types/food";
import { toast } from "sonner";

const categories: Category[] = ["Veg", "Non-Veg", "Bakery", "Fried", "Sweets"];
const purposes: { key: Purpose; label: string }[] = [
  { key: "humans", label: "🧑 Humans" },
  { key: "animals", label: "🐾 Animals" },
  { key: "both", label: "♻️ Both" },
];

export default function PostFood() {
  const nav = useNavigate();
  const [image, setImage] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("Veg");
  const [purpose, setPurpose] = useState<Purpose>("humans");
  const [safe, setSafe] = useState(true);
  const [paid, setPaid] = useState(false);
  const [allowSplit, setAllowSplit] = useState(true);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Food posted! Helping the world 🌱");
    nav("/activity");
  };

  return (
    <div className="px-4 py-5 space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Post Leftover Food</h1>

      <form onSubmit={submit} className="space-y-5">
        {/* Image */}
        <label className="block">
          <div className="h-44 rounded-2xl border-2 border-dashed border-border bg-muted/40 flex flex-col items-center justify-center cursor-pointer overflow-hidden">
            {image ? (
              <img src={image} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <>
                <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground font-semibold">Tap to upload photo</p>
              </>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setImage(URL.createObjectURL(file));
            }}
          />
        </label>

        <input className="input-field" placeholder="Food name" required />
        <input className="input-field" placeholder="Quantity (e.g. 5kg, 10 plates)" required />
        <input className="input-field" type="datetime-local" placeholder="Prepared time" required />
        <input className="input-field" type="datetime-local" placeholder="Expiry time" required />
        <input className="input-field" placeholder="Pickup address" required />

        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Chip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Purpose</p>
          <div className="flex flex-wrap gap-2">
            {purposes.map((p) => (
              <Chip key={p.key} label={p.label} active={purpose === p.key} onClick={() => setPurpose(p.key)} />
            ))}
          </div>
        </div>

        <Toggle label="Safe for animals" value={safe} onChange={setSafe} />
        <Toggle label={paid ? "Paid" : "Free"} value={paid} onChange={setPaid} />
        {paid && <input className="input-field" placeholder="Price (₹)" type="number" min="1" required />}
        <Toggle label="Allow split among multiple users" value={allowSplit} onChange={setAllowSplit} />

        <textarea className="input-field resize-none" rows={3} placeholder="Notes (optional)" />

        <button type="submit" className="btn-primary">Post Food</button>
      </form>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between bg-card p-4 rounded-2xl shadow-soft">
      <span className="font-semibold text-sm">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-12 h-7 rounded-full transition-all relative ${value ? "bg-primary-deep" : "bg-muted-foreground/30"}`}
      >
        <span className={`absolute top-1 w-5 h-5 rounded-full bg-card shadow-soft transition-all ${value ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}
