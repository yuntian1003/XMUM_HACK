import { Link, useLocation } from "wouter";
import { Home, Camera, BarChart2, Building2, User, Leaf, Wifi, WifiOff, Menu, X, Shield, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

// ── Navigation items per tier ─────────────────────────────────────────────────
const BOTTOM_NAV = [
  { href: "/", icon: Home, label: "Portal" },
  { href: "/government-dashboard", icon: Building2, label: "Gov" },
  { href: "/scan", icon: Camera, label: "Scan", primary: true },
  { href: "/farm-desk", icon: Warehouse, label: "Farm Desk" },
  { href: "/profile", icon: User, label: "Profile" },
];

const ALL_NAV = [
  { href: "/", icon: Home, label: "Portal", tier: null },
  { href: "/scan", icon: Camera, label: "Crop Scanner", tier: "1" },
  { href: "/government-dashboard", icon: Building2, label: "Government", tier: null },
  { href: "/farmer-hub", icon: Leaf, label: "Farmer Hub", tier: "1" },
  { href: "/farm-desk", icon: Warehouse, label: "Farm Desk", tier: "1" },
  { href: "/profile", icon: User, label: "Profile", tier: null },
];

function isActiveRoute(location: string, href: string) {
  if (href === "/") return location === "/";
  if (href === "/scan") {
    return (
      location.startsWith("/scan") ||
      location.startsWith("/history") ||
      location.startsWith("/result") ||
      location.startsWith("/home")
    );
  }
  if (href === "/farmer-hub") {
    return location.startsWith("/farmer-hub") || location.startsWith("/dashboard");
  }
  return location.startsWith(href);
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  // Close menu on navigation
  useEffect(() => { setMenuOpen(false); }, [location]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top bar — dark glassmorphism */}
      <header
        className="sticky top-0 z-40 h-14 flex items-center px-4 gap-3 border-b"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1a2744 50%, #0f2318 100%)",
          borderColor: "rgba(255,255,255,0.08)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.35)",
        }}
      >
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer group">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                boxShadow: "0 0 16px rgba(34,197,94,0.35)",
              }}
            >
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="font-display font-bold text-white text-base tracking-tight"
                style={{ textShadow: "0 0 20px rgba(34,197,94,0.3)" }}
              >
                AgriGuard
              </span>
              <span className="text-[9px] font-semibold tracking-[0.2em] uppercase" style={{ color: "rgba(134,239,172,0.7)" }}>
                AI Platform
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-6 flex-1">
          {ALL_NAV.map(({ href, icon: Icon, label }) => {
            const isActive = isActiveRoute(location, href);
            return (
              <Link key={href} href={href}>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-white"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                  )}
                  style={isActive ? {
                    background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(22,163,74,0.1))",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 12px rgba(34,197,94,0.15)",
                    border: "1px solid rgba(34,197,94,0.25)",
                  } : {}}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Right side — online indicator + mobile menu */}
        <div className="ml-auto flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold transition-all",
            isOnline
              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
              : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
          )}>
            {isOnline
              ? <><Wifi className="w-3 h-3" /><span className="hidden sm:inline">Online</span></>
              : <><WifiOff className="w-3 h-3" /><span className="hidden sm:inline">Offline</span></>
            }
          </div>
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 top-14 bg-black/40 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="border-b shadow-2xl"
            style={{
              background: "linear-gradient(180deg, #0f172a 0%, #1a2744 100%)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-4 space-y-1">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3">Navigation</p>
              {ALL_NAV.map(({ href, icon: Icon, label }) => {
                const isActive = isActiveRoute(location, href);
                return (
                  <Link key={href} href={href}>
                    <button className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                      isActive
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}>
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{label}</span>
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* Bottom navigation — mobile only */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t"
        style={{
          background: "rgba(15,23,42,0.95)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center justify-around px-2 h-16 max-w-lg mx-auto">
          {BOTTOM_NAV.map(({ href, icon: Icon, label, primary }) => {
            const isActive = isActiveRoute(location, href);
            return (
              <Link key={href} href={href}>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all",
                    primary
                      ? "w-14 h-14 -mt-5 rounded-2xl text-white active:scale-95"
                      : isActive
                      ? "text-emerald-400"
                      : "text-white/40 hover:text-white/70"
                  )}
                  style={primary ? {
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    boxShadow: "0 0 20px rgba(34,197,94,0.5), 0 4px 16px rgba(0,0,0,0.4)",
                  } : {}}
                >
                  <Icon className={cn("shrink-0", primary ? "w-6 h-6" : "w-5 h-5")} />
                  {!primary && <span className="text-[10px] font-medium leading-none">{label}</span>}
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
