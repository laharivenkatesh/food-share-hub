import { Star } from "lucide-react";
import { useState } from "react";
import { Review } from "@/types/food";
import { toast } from "sonner";

export default function ReviewSection({ initial }: { initial: Review[] }) {
  const [reviews, setReviews] = useState<Review[]>(initial);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !comment.trim()) return;
    setReviews([{ id: Date.now().toString(), user: "You", rating, comment, date: "just now" }, ...reviews]);
    setRating(0); setComment("");
    toast.success("✅ Feedback submitted");
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
