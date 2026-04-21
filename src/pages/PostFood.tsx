import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, X } from "lucide-react";
import Chip from "@/components/Chip";
import { Category, Purpose } from "@/types/food";
import { useMyPosts } from "@/hooks/useMyPosts";
import { toast } from "sonner";

const categories: Category[] = ["Veg", "Non-Veg", "Bakery", "Fried", "Sweets"];
const purposes: { key: Purpose; label: string }[] = [
  { key: "humans", label: "🧑 Humans" },
  { key: "animals", label: "🐾 Animals" },
  { key: "both", label: "♻️ Both" },
];

const MAX_IMAGE_SIZE_MB = 2;

export default function PostFood() {
  const nav = useNavigate();
  const { addPost, getLastPostTime } = useMyPosts();
  const [image, setImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [preparedAt, setPreparedAt] = useState("");
  const [expiryHours, setExpiryHours] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [feeds, setFeeds] = useState("");
  const [category, setCategory] = useState<Category>("Veg");
  const [purpose, setPurpose] = useState<Purpose>("humans");
  const [safe, setSafe] = useState(true);
  const [paid, setPaid] = useState(false);
  const [price, setPrice] = useState("");
  const [allowSplit, setAllowSplit] = useState(true);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_IMAGE_SIZE_MB) {
      setImageError(`Image too large (${sizeMB.toFixed(1)} MB). Max allowed: ${MAX_IMAGE_SIZE_MB} MB.`);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    toast.loading("Finding your location...", { id: "loc" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude.toFixed(6));
        setLng(longitude.toFixed(6));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          if (data?.display_name) {
            setAddress(data.display_name);
            toast.success("Location set accurately!", { id: "loc" });
          } else {
            toast.success("Coordinates set", { id: "loc" });
          }
        } catch {
          toast.success("Coordinates set, but could not fetch address", { id: "loc" });
        }
      },
      () => toast.error("Could not get location", { id: "loc" })
    );
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lat || !lng) {
      toast.error("Please set a pickup location using 'Use my location' or enter coordinates.");
      return;
    }
    const lastPostTime = getLastPostTime();
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    if (Date.now() - lastPostTime < TWO_HOURS) {
      setShowConfirm(true);
    } else {
      executeSubmit();
    }
  };

  const executeSubmit = async () => {
    setShowConfirm(false);
    setBusy(true);
    const res = await addPost({
      name: name.trim(),
      image: image, // base64 string stored directly
      feeds: Number(feeds) || 1,
      price: paid ? Number(price) || 0 : 0,
      expiry_hours: Number(expiryHours) || 4,
      prepared_at: preparedAt || new Date().toLocaleString(),
      address: address.trim(),
      lat: Number(lat),
      lng: Number(lng),
      category,
      tags: [],
      purpose,
      safe_for_animals: safe,
      status: "available",
      realtime_status: "Still Available",
      quantity: quantity.trim(),
      notes: notes.trim() || null,
      allow_split: allowSplit,
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Food posted! Helping the world 🌱");
    nav("/");
  };

  return (
    <div className="px-4 py-5 space-y-5 pb-10">
      <h1 className="text-2xl font-extrabold tracking-tight">Post Leftover Food</h1>

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card shadow-card rounded-3xl p-6 max-w-sm w-full border border-border">
            <h2 className="text-xl font-extrabold mb-3 text-foreground">Post Frequency Warning</h2>
            <p className="text-muted-foreground text-sm font-semibold mb-6">
              You posted food less than 2 hours ago. Is this new food prepared or being cooked
              in less than 5–6 hours?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1">
                No, Cancel
              </button>
              <button onClick={executeSubmit} className="btn-primary flex-1">
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleInitialSubmit} className="space-y-4">
        {/* Image Upload */}
        <div className="space-y-1">
          <label className="block">
            <div className="h-44 rounded-2xl border-2 border-dashed border-border bg-muted/40 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative">
              {image ? (
                <>
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setImage(null);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-card/90 flex items-center justify-center shadow-soft"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground font-semibold">Tap to upload photo</p>
                  <p className="text-xs text-muted-foreground mt-1">Max {MAX_IMAGE_SIZE_MB} MB</p>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </label>
          {imageError && (
            <p className="text-xs text-destructive font-semibold">{imageError}</p>
          )}
        </div>

        {/* Food details */}
        <div className="space-y-3">
          <input
            className="input-field"
            placeholder="Food name (e.g. Biryani, Rotis)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input-field"
            placeholder="Quantity (e.g. 5 kg, 10 plates, 2 boxes)"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
          <input
            className="input-field"
            placeholder="Feeds how many people? (e.g. 8)"
            type="number"
            min="1"
            value={feeds}
            onChange={(e) => setFeeds(e.target.value)}
            required
          />
          <input
            className="input-field"
            placeholder="When was it prepared? (e.g. 1 hour ago, 10:30 AM)"
            value={preparedAt}
            onChange={(e) => setPreparedAt(e.target.value)}
          />
          <input
            className="input-field"
            placeholder="Expires in how many hours? (e.g. 4)"
            type="number"
            min="0.5"
            step="0.5"
            value={expiryHours}
            onChange={(e) => setExpiryHours(e.target.value)}
            required
          />
        </div>

        {/* Location */}
        <div className="space-y-3">
          <input
            className="input-field"
            placeholder="Pickup address (e.g. 12 Anna Salai, Chennai)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input-field"
              placeholder="Latitude"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              required
            />
            <input
              className="input-field"
              placeholder="Longitude"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              required
            />
          </div>
          <button type="button" onClick={useMyLocation} className="btn-secondary w-full">
            📍 Use my location
          </button>
          {lat && lng && (
            <p className="text-xs text-success font-semibold text-center">
              ✓ Location set: {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Chip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
            ))}
          </div>
        </div>

        {/* Purpose */}
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Purpose</p>
          <div className="flex flex-wrap gap-2">
            {purposes.map((p) => (
              <Chip
                key={p.key}
                label={p.label}
                active={purpose === p.key}
                onClick={() => setPurpose(p.key)}
              />
            ))}
          </div>
        </div>

        <Toggle label="Safe for animals" value={safe} onChange={setSafe} />
        <Toggle label={paid ? "Paid listing" : "Free listing"} value={paid} onChange={setPaid} />
        {paid && (
          <input
            className="input-field"
            placeholder="Price in ₹ (e.g. 50)"
            type="number"
            min="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        )}
        <Toggle label="Allow split among multiple users" value={allowSplit} onChange={setAllowSplit} />

        <textarea
          className="input-field resize-none"
          rows={3}
          placeholder="Any notes for the collector? (e.g. spicy, contains nuts, doorstep pickup)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Posting…" : "Post Food 🌱"}
        </button>
      </form>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between bg-card p-4 rounded-2xl shadow-soft">
      <span className="font-semibold text-sm">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-12 h-7 rounded-full transition-all relative ${value ? "bg-primary-deep" : "bg-muted-foreground/30"
          }`}
      >
        <span
          className={`absolute top-1 w-5 h-5 rounded-full bg-card shadow-soft transition-all ${value ? "left-6" : "left-1"
            }`}
        />
      </button>
    </div>
  );
}