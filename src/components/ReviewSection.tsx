import { Star } from "lucide-react";
import { useState, useEffect } from "react";
import { Review } from "@/types/food";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface ReviewSectionProps {
  foodId: string;
  providerId: string;
  initial: Review[];
}

export default function ReviewSection({ foodId, providerId, initial }: ReviewSectionProps) {
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>(initial);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    setReviews(initial);
  }, [initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !comment.trim()) return;
    if (!user || !profile) {
      toast.error("Please login to submit a review");
      return;
    }

    try {
      // 1. Insert review into Supabase
      const { data, error } = await supabase
        .from("reviews")
        .insert({
          food_id: foodId,
          user_id: user.id,
          user_name: profile.name || "Anonymous",
          rating,
          comment,
        })
        .select()
        .single();

      if (error) {
        console.error("Error submitting review:", error);
        toast.error("Failed to submit review");
        return;
      }

      // 2. Insert notification for provider (only if reviewer is not the provider themselves)
      if (providerId && providerId !== user.id) {
        await supabase.from("notifications").insert({
          user_id: providerId,
          food_id: foodId,
          title: "⭐ New Review Received!",
          message: `${profile.name || "A collector"} left a ${rating}-star review: "${comment}"`,
        });
      }

      // 3. Update local state
      setReviews([
        {
          id: data.id,
          user: profile.name || "You",
          rating,
          comment,
          date: "just now",
        },
        ...reviews,
      ]);

      setRating(0);
      setComment("");
      toast.success("✅ Feedback submitted");
    } catch (err) {
      console.error("Exception submitting review:", err);
      toast.error("An error occurred. Please try again.");
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="font-extrabold text-lg">Reviews</h2>

      <form onSubmit={submit} className="bg-muted/50 p-4 rounded-2xl space-y-3">
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(i => (
            <button key={i} type="button" onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(0)} onClick={()=>setRating(i)}>
              <Star className={`w-7 h-7 transition-all ${i <= (hover||rating) ? "fill-warning text-warning" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={e=>setComment(e.target.value)}
          placeholder="Share your experience…"
          rows={3}
          className="input-field resize-none"
        />
        <button type="submit" className="btn-primary">Submit Review</button>
      </form>

      <div className="space-y-3">
        {reviews.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No reviews yet.</p>}
        {reviews.map(r => (
          <div key={r.id} className="bg-card p-4 rounded-2xl shadow-soft">
            <div className="flex items-center justify-between">
              <span className="font-bold">{r.user}</span>
              <span className="text-xs text-muted-foreground">{r.date}</span>
            </div>
            <div className="flex gap-0.5 my-1">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`w-4 h-4 ${i <= r.rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
              ))}
            </div>
            <p className="text-sm text-foreground">{r.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
