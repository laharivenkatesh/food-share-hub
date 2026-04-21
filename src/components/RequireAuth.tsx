import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) {
    return (
      <div className="p-8 text-center mt-20">
        <h2 className="text-xl font-bold text-destructive mb-2">Configuration Missing</h2>
        <p className="text-muted-foreground text-sm">
          It looks like your Vercel deployment is missing the Supabase environment variables.
          Please go to your Vercel Project Settings, add <code className="font-bold">VITE_SUPABASE_URL</code> and <code className="font-bold">VITE_SUPABASE_ANON_KEY</code>, and then <b>Redeploy</b>.
        </p>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground font-bold animate-pulse">Loading…</div>;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  return children;
}