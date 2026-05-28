import { useParams, Link, useNavigate } from "react-router-dom";
import { useAllFoods } from "@/hooks/useMyPosts";
import MapPreview, { openInGoogleMaps } from "@/components/MapPreview";
import ReviewSection from "@/components/ReviewSection";
import { ArrowLeft, Navigation, Star, Award, Flame, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { RealtimeStatus } from "@/types/food";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useTransactions";
import LiveCountdown from "@/components/LiveCountdown";
import { supabase } from "@/lib/supabase";
import { getFoodTimes } from "@/lib/utils";


const realtimeOptions: RealtimeStatus[] = ["Still Available", "Almost Gone", "Not Available"];

export default function FoodDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, profile } = useAuth();
  const { getTransactionForFood, requestFood, markCollected, markDonated } = useTransactions();

  const { foods } = useAllFoods();
  const food = foods.find((f) => f.id === id);
  const [rt, setRt] = useState<RealtimeStatus>("Still Available");
  const [oppositeProfile, setOppositeProfile] = useState<any>(null);
  const [selectedPortions, setSelectedPortions] = useState(1);
  const [bookingBusy, setBookingBusy] = useState(false);

  // Sync realtimeStatus state when food is loaded
  useEffect(() => {
    if (food) {
      setRt(food.realtimeStatus);
    }
  }, [food]);

  useEffect(() => {
    const fetchOppositeProfile = async () => {
      const tx = getTransactionForFood(id || "");
      if (tx && user && food) {
        const isDonorCheck = user?.id === food.provider.id;
        const profileId = isDonorCheck ? tx.collector_id : tx.donor_id;
        if (profileId) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", profileId)
            .single();
          setOppositeProfile(data);
        }
      }
    };
    fetchOppositeProfile();
  }, [id, user, food, getTransactionForFood]);

  const { primaryExpiry, secondaryExpiry } = food ? getFoodTimes(food) : { primaryExpiry: 0, secondaryExpiry: 0 };
  const now = Date.now();
  const isExpired = food ? now >= primaryExpiry : false;
  const isHardExpired = food ? now >= secondaryExpiry : false;

  useEffect(() => {
    if (isHardExpired) {
      toast.error("This listing has hard-expired and is no longer available.");
      nav("/");
    }
  }, [isHardExpired, nav]);

  if (!food) return <div className="p-8 text-center">Food not found. <Link to="/" className="text-primary-deep font-bold">Go home</Link></div>;

  if (isHardExpired) {
    return <div className="p-8 text-center">Listing expired. <Link to="/" className="text-primary-deep font-bold">Go home</Link></div>;
  }

  const tx = getTransactionForFood(food.id);
  const isDonor = user?.id === food.provider.id;
  const isCollector = tx?.collector_id === user?.id;
  const isUrgent = food.expiryHours < 1;
  const isCollected = food.status === "collected";

  
  const total = food.feeds;
  const booked = food.bookedPortions || 0;
  const remaining = Math.max(0, total - booked);
  const isFullyBooked = remaining <= 0;

  const isReserved = food.status === "reserved" && !tx;



  const renderPortionBooking = () => {
    if (isDonor) {
      return (
        <div className="bg-muted/50 p-4 rounded-2xl text-center text-xs font-bold text-muted-foreground">
          👑 You are the provider of this listing. Waiting for bookings...
        </div>
      );
    }

    if (isCollected) {
      return (
        <div className="bg-muted/30 p-4 rounded-2xl text-center text-xs font-bold text-muted-foreground">
          🔒 Collected & Closed
        </div>
      );
    }

    if (isFullyBooked || food.status === "reserved") {
      return (
        <button disabled className="btn-secondary opacity-50 w-full cursor-not-allowed bg-muted/60 text-xs font-extrabold">
          🔒 Fully Booked / Reserved
        </button>
      );
    }

    if (tx) {
      return null;
    }

    return (
      <div className="bg-card p-4 rounded-2xl border border-border/80 shadow-soft space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Select Portions to Book
          </label>
          <span className="text-[11px] font-extrabold text-primary-deep bg-primary/10 px-2.5 py-1 rounded-full">
            {remaining} left
          </span>
        </div>

        <div className="flex gap-2.5">
          <select
            value={selectedPortions}
            onChange={(e) => setSelectedPortions(Number(e.target.value))}
            className="flex-1 px-3 py-2.5 rounded-xl bg-input border border-border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {Array.from({ length: remaining }, (_, i) => i + 1).map((val) => (
              <option key={val} value={val}>
                {val} {val === 1 ? "portion" : "portions"}
              </option>
            ))}
          </select>

          <button
            onClick={async () => {
              if (!user) {
                toast.error("Please login to book food");
                nav("/auth");
                return;
              }
              setBookingBusy(true);
              const toastId = toast.loading("Booking portions...");
              
              try {
                await requestFood(food.id, food.provider.id, selectedPortions);
                
                // Add notifications to both donor and collector
                await supabase.from("notifications").insert([
                  {
                    user_id: food.provider.id,
                    food_id: food.id,
                    title: "🍽️ New Portion Booking!",
                    message: `${profile?.name || 'A user'} booked ${selectedPortions} portions of your ${food.name}.`
                  },
                  {
                    user_id: user.id,
                    food_id: food.id,
                    title: "✅ Booking Confirmed!",
                    message: `You successfully booked ${selectedPortions} portions of ${food.name}.`
                  }
                ]);

                toast.success(`Booked ${selectedPortions} portions successfully!`, { id: toastId });
              } catch (e: any) {
                toast.error(e.message || "Failed to book portions", { id: toastId });
              } finally {
                setBookingBusy(false);
              }
            }}
            disabled={bookingBusy || remaining <= 0}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-extrabold text-xs shadow-soft hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
          >
            🍽️ Book Now
          </button>
        </div>
      </div>
    );
  };

  const renderTransactionStatus = () => {
    if (tx?.status === "completed" || tx?.status === "accepted" || tx?.status === "pending") {
      const ContactCard = () => (
        oppositeProfile ? (
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm mb-3 flex items-center gap-4">
            <img
              src={food.image}
              alt={food.name}
              className="w-16 h-16 rounded-xl object-cover shadow-sm shrink-0"
              onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80"; }}
            />
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
                {isDonor ? "Collector Details" : "Donor Details"}
              </p>
              <p className="font-extrabold text-foreground text-lg">{oppositeProfile?.name || "Loading..."}</p>
              <p className="text-sm font-bold text-primary-deep">{oppositeProfile?.phone || "No phone provided"}</p>
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

      // Pending/Accepted status
      if (isCollector) {
        if (tx.collector_accepted) {
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
            <button onClick={async () => { await markCollected(food.id); toast.success("Marked as collected!"); }} className="btn-primary">
              I Have Collected This
            </button>
          </div>
        );
      }

      if (isDonor) {
        if (tx.donor_accepted) {
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
            <button onClick={async () => { await markDonated(food.id); toast.success("Marked as donated!"); }} className="btn-primary">
              I Have Donated This
            </button>
          </div>
        );
      }
      return <button disabled className="btn-secondary opacity-50">Reserved by another user</button>;
    }

    // Fallback if tx was cancelled or not found
    return null;
  };


  // Custom status configuration
  let statusText = food.status as string;
  let statusColorClass = "bg-success text-success-foreground";

  if (isCollected) {
    statusText = "collected";
    statusColorClass = "bg-muted-foreground/30 text-foreground";
  } else if (isReserved || isFullyBooked) {
    statusText = isFullyBooked ? "booked" : "reserved";
    statusColorClass = isFullyBooked ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground";
  } else {
    statusText = "available";
    statusColorClass = "bg-success text-success-foreground";
  }

  return (
    <div className="pb-6">
      <div className="relative">
        <img
          src={food.image}
          alt={food.name}
          className="w-full h-64 object-cover"
          onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80"; }}
        />
        <button onClick={() => nav(-1)} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-card/90 backdrop-blur flex items-center justify-center shadow-soft">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`badge-pill ${statusColorClass}`}>
                {statusText}
              </span>
              <span className="badge-pill bg-primary/10 text-primary-deep font-extrabold">
                📊 {remaining} / {total} portions available
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-foreground truncate">{food.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">Quantity: {food.quantity}</p>
            <p className="text-sm text-muted-foreground">Prepared: {food.preparedAt}</p>
          </div>
          <div className="shrink-0 text-right">
            {food.price === 0 ? (
              <span className="badge-pill bg-success text-success-foreground !text-sm">FREE</span>
            ) : (
              <span className="font-extrabold text-2xl text-foreground">₹{food.price}</span>
            )}
          </div>
        </div>

        {/* Portions Progress Bar */}
        <div className="space-y-1 bg-card p-3.5 rounded-2xl border border-border/50 shadow-soft">
          <div className="flex justify-between text-xs font-bold text-muted-foreground">
            <span>Portions Booked</span>
            <span>{booked} / {total} Claimed</span>
          </div>
          <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden border border-border/40 mt-1">
            <div 
              className="bg-primary-deep h-full transition-all duration-500" 
              style={{ width: `${(booked / total) * 100}%` }}
            />
          </div>
        </div>


        {isExpired ? (
          <div className="bg-warning/15 border border-warning text-warning-foreground p-4 rounded-2xl font-bold text-sm space-y-1">
            <div className="flex items-center gap-2 text-warning-foreground font-extrabold text-base">
              ⚠️ Expired but Claimable
            </div>
            <p className="text-xs font-semibold text-muted-foreground leading-normal mt-1">
              This listing has passed its premium freshness window, but is still available for pet food, composting, or quick consumption. 
            </p>
          </div>
        ) : isUrgent ? (
          <div className="bg-urgent/15 border border-urgent text-urgent p-3 rounded-2xl font-bold text-sm flex items-center gap-2">
            <LiveCountdown postedAt={food.postedAt} expiryHours={food.expiryHours} urgent={true} />
          </div>
        ) : (
          <div className="bg-muted p-3 rounded-2xl text-sm font-semibold">
            <LiveCountdown postedAt={food.postedAt} expiryHours={food.expiryHours} urgent={false} />
          </div>
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

        {/* Portion Booking Form */}
        {renderPortionBooking()}

        {/* Transaction Flow Buttons */}
        {tx && renderTransactionStatus()}


        <ReviewSection initial={food.reviews} />
      </div>
    </div>
  );
}