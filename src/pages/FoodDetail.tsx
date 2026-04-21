import { useParams, Link, useNavigate } from "react-router-dom";
import { mockFoods } from "@/data/mockFoods";
import MapPreview, { openInGoogleMaps } from "@/components/MapPreview";
import ReviewSection from "@/components/ReviewSection";
import { ArrowLeft, Navigation, Star, Award, Flame, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RealtimeStatus } from "@/types/food";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useTransactions";

const realtimeOptions: RealtimeStatus[] = ["Still Available", "Almost Gone", "Not Available"];

export default function FoodDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { getTransactionForFood, requestFood, markCollected, markDonated } = useTransactions();
  
  const food = mockFoods.find((f) => f.id === id);
  const [rt, setRt] = useState<RealtimeStatus>(food?.realtimeStatus || "Still Available");

  if (!food) return <div className="p-8 text-center">Food not found. <Link to="/" className="text-primary-deep font-bold">Go home</Link></div>;

  const tx = getTransactionForFood(food.id);
  const isDonor = user?.id === food.provider.id;
  const isCollector = tx?.collectorId === user?.id;
  const isUrgent = food.expiryHours < 1;
  const isReserved = food.status === "reserved" && !tx;

  const getProfileFromStorage = (userId: string) => {
    const usersJson = localStorage.getItem("zerra_users") || "[]";
    const users = JSON.parse(usersJson);
    return users.find((u: any) => u.id === userId);
  };

  const renderTransactionStatus = () => {
    if (tx?.status === "completed" || tx?.status === "floating") {
      const oppositeId = isDonor ? tx.collectorId : tx.donorId;
      const oppositeProfile = oppositeId ? getProfileFromStorage(oppositeId) : null;

      const ContactCard = () => (
        oppositeProfile ? (
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm mb-3 flex items-center gap-4">
            <img src={food.image} alt={food.name} className="w-16 h-16 rounded-xl object-cover shadow-sm shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
                {isDonor ? "Collector Details" : "Donor Details"}
              </p>
              <p className="font-extrabold text-foreground text-lg">{oppositeProfile.name}</p>
              <p className="text-sm font-bold text-primary-deep">{oppositeProfile.phone || "No phone provided"}</p>
            </div>
          </div>
        ) : null
      );

      if (tx.status === "completed") {
        return (
          <div className="space-y-3">
            <ContactCard />
            <div className="bg-success/15 border border-success text-success p-4 rounded-2xl flex items-center justify-center gap-2 font-bold">
              <CheckCircle2 className="w-5 h-5" /> Transaction Completed
            </div>
          </div>
        );
      }

      // Floating status
      if (isCollector) {
        if (tx.collectorAccepted) {
          return (
            <div className="space-y-3">
              <ContactCard />
              <button disabled className="btn-secondary opacity-70">Waiting for donor to confirm...</button>
            </div>
          );
        }
        return (
          <div className="space-y-3">
            <ContactCard />
            <div className="p-3 bg-warning/15 text-warning font-bold rounded-xl text-center text-sm">
              You requested this food. Confirm when you collect it.
            </div>
            <button onClick={() => { markCollected(food.id); toast.success("Marked as collected!"); }} className="btn-primary">
              I Have Collected This
            </button>
          </div>
        );
      }

      if (isDonor) {
        if (tx.donorAccepted) {
          return (
            <div className="space-y-3">
              <ContactCard />
              <button disabled className="btn-secondary opacity-70">Waiting for collector to confirm...</button>
            </div>
          );
        }
        return (
          <div className="space-y-3">
            <ContactCard />
            <div className="p-3 bg-primary/15 text-primary-deep font-bold rounded-xl text-center text-sm">
              Someone has requested this. Confirm when you donate it.
            </div>
            <button onClick={() => { markDonated(food.id); toast.success("Marked as donated!"); }} className="btn-primary">
              I Have Donated This
            </button>
          </div>
        );
      }
      return <button disabled className="btn-secondary opacity-50">Reserved by another user</button>;
    }

    // Available
    if (isDonor) {
      return <button disabled className="btn-secondary opacity-70">Waiting for requests...</button>;
    }
    
    if (isReserved) {
      return <button disabled className="btn-secondary opacity-50">Already Reserved</button>;
    }

    return (
      <button 
        onClick={() => {
          if (!user) {
            toast.error("Please login to request food");
            nav("/auth");
            return;
          }
          requestFood(food.id, food.provider.id); 
          toast.success("Pickup requested! Provider notified."); 
        }} 
        className="btn-primary"
      >
        Request Pickup
      </button>
    );
  };

  return (
    <div className="pb-6">
      <div className="relative">
        <img src={food.image} alt={food.name} className="w-full h-64 object-cover" />
        <button onClick={()=>nav(-1)} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-card/90 backdrop-blur flex items-center justify-center shadow-soft">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">{food.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">Quantity: {food.quantity}</p>
            <p className="text-sm text-muted-foreground">Prepared: {food.preparedAt}</p>
          </div>
          {food.price === 0 ? (
            <span className="badge-pill bg-success text-success-foreground !text-sm">FREE</span>
          ) : (
            <span className="font-extrabold text-2xl">₹{food.price}</span>
          )}
        </div>

        {isUrgent ? (
          <div className="bg-urgent/15 border border-urgent text-urgent p-3 rounded-2xl font-bold text-sm flex items-center gap-2">
            🔥 Urgent — expires in {Math.round(food.expiryHours * 60)} minutes
          </div>
        ) : (
          <div className="bg-muted p-3 rounded-2xl text-sm font-semibold">⏳ Expires in {food.expiryHours} hours</div>
        )}

        {food.purpose === "animals" && (
          <div className="bg-secondary/40 p-3 rounded-2xl text-sm font-semibold">
            ⚠️ Moving to Animal Feed Priority
          </div>
        )}

        <section className="space-y-2">
          <h2 className="font-extrabold">Pickup Address</h2>
          <p className="text-sm text-muted-foreground">{food.address}</p>
          <MapPreview lat={food.lat} lng={food.lng} label={food.name} height="h-48" interactive />
          <button onClick={() => openInGoogleMaps(food.lat, food.lng)} className="btn-secondary flex items-center justify-center gap-2">
            <Navigation className="w-4 h-4" /> Open in Maps
          </button>
        </section>

        {/* Realtime status */}
        <section className="space-y-2">
          <h2 className="font-extrabold">Live Status</h2>
          <div className="flex gap-2 flex-wrap">
            {realtimeOptions.map((r) => (
              <button
                key={r}
                onClick={() => { setRt(r); toast.success(`Status: ${r}`); }}
                className={`chip ${rt === r ? "chip-active" : "chip-default"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </section>

        {/* Provider */}
        <section className="card-soft p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-2xl">{food.provider.avatar}</div>
            <div className="flex-1">
              <p className="font-extrabold">{food.provider.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3 fill-warning text-warning" /> {food.provider.trustScore} Trust Score
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold flex items-center gap-1 text-urgent"><Flame className="w-3 h-3" /> {food.provider.streak} day</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {food.provider.badges.map((b) => (
              <span key={b} className="badge-pill bg-primary text-primary-foreground"><Award className="w-3 h-3" /> {b}</span>
            ))}
          </div>
          {food.provider.reliability === "low" && (
            <p className="text-xs text-destructive font-bold">⚠️ Low reliability user — proceed with caution</p>
          )}
        </section>

        {food.notes && (
          <div className="bg-muted/50 p-4 rounded-2xl text-sm">
            <p className="font-bold mb-1">Notes from provider</p>
            <p className="text-muted-foreground">{food.notes}</p>
          </div>
        )}

        {/* Transaction Flow Buttons */}
        {renderTransactionStatus()}

        <ReviewSection initial={food.reviews} />
      </div>
    </div>
  );
}
