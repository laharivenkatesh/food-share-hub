import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, PlusCircle, User, Leaf } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const hideNav = location.pathname === "/auth";

  const handleSignOut = async () => {
    await logout();
    nav("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative shadow-card">
      {!hideNav && (
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-primary-deep flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-deep-foreground" />
            </div>
            <span className="font-extrabold text-xl text-foreground tracking-tight">Zerra</span>
          </Link>
          {user && (
            <button onClick={handleSignOut} className="text-xs font-bold text-primary-deep">
              Sign Out
            </button>
          )}
        </header>
      )}

      <main className="flex-1 pb-24">{children}</main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border px-4 py-2 flex items-center justify-around z-50 shadow-card">
          <NavItem to="/" icon={<Home className="w-5 h-5" />} label="Home" />
          <NavItem to="/post" icon={<PlusCircle className="w-7 h-7" />} label="Post" highlight />
          <NavItem to="/activity" icon={<User className="w-5 h-5" />} label="Activity" />
        </nav>
      )}
    </div>
  );
}

function NavItem({ to, icon, label, highlight }: { to: string; icon: React.ReactNode; label: string; highlight?: boolean }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all ${
          isActive ? "text-primary-deep" : "text-muted-foreground"
        } ${highlight ? "scale-110" : ""}`
      }
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </NavLink>
  );
}
