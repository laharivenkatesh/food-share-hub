import { useEffect, useState } from "react";
import { Leaf } from "lucide-react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);

  // Trigger fade out slightly before the 3 seconds timer ends
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setVisible(false);
    }, 2700); // Start fade-out at 2.7s
    return () => clearTimeout(fadeTimer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 transition-all duration-300 ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
      }`}
    >
      {/* Decorative background glow rings */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" />

      {/* Main glass card container */}
      <div className="text-center space-y-6 max-w-sm px-6 py-10 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center animate-fade-up">
        
        {/* Animated Premium Logo Container */}
        <div className="relative w-32 h-32 rounded-[40px] bg-emerald-800/40 border border-emerald-500/30 flex items-center justify-center p-3 shadow-inner hover:scale-105 transition-transform duration-500 group">
          {/* Inner pulsating glow */}
          <div className="absolute inset-0 rounded-[40px] bg-emerald-500/10 blur-md animate-ping opacity-60" />
          
          <img
            src="/food_splash_logo.png"
            alt="Zerra Logo"
            className="w-full h-full object-contain rounded-[28px] relative z-10 animate-wiggle"
            onError={(e) => {
              // Fallback to high-quality SVG/Leaf if image fails to load
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const fallback = document.createElement("div");
                fallback.className = "flex items-center justify-center w-full h-full text-5xl";
                fallback.innerHTML = "🍱";
                parent.appendChild(fallback);
              }
            }}
          />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            <Leaf className="w-8 h-8 text-emerald-400 animate-bounce" />
            <span className="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
              Zerra
            </span>
          </h1>
          <p className="text-sm font-medium text-emerald-200/70 tracking-wide">
            Connecting Communities, Saving Meals
          </p>
        </div>

        {/* Premium Pulsing Loader */}
        <div className="flex items-center gap-1.5 pt-4">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-bounce" />
        </div>

      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-8 text-center space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/60">
          SECURE GREEN TECHNOLOGY
        </p>
        <p className="text-[9px] text-emerald-200/40">
          © {new Date().getFullYear()} Zerra. All rights reserved.
        </p>
      </div>

    </div>
  );
}
