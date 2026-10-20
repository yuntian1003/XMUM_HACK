import { Link, useLocation } from "wouter";
import { Home, Camera, BarChart2, Building2, User, Leaf, Wifi, WifiOff, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

// ── Navigation items per tier ─────────────────────────────────────────────────
const BOTTOM_NAV = [
  { href: "/", icon: Home, label: "Portal" },
  { href: "/government-dashboard", icon: Building2, label: "Gov" },
  { href: "/scan", icon: Camera, label: "Crop Scanner", primary: true },
  { href: "/farmer-hub", icon: BarChart2, label: "Farmer" },
  { href: "/profile", icon: User, label: "Profile" },
];

const ALL_NAV = [
  { href: "/", icon: Home, label: "Portal", tier: null },
  { href: "/scan", icon: Camera, label: "Crop Scanner", tier: "1" },
  { href: "/government-dashboard", icon: Building2, label: "Government", tier: null },
  { href: "/farmer-hub", icon: Leaf, label: "Farmer Hub", tier: "1" },
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
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-[#163a24] border-b border-white/10 h-14 flex items-center px-4 gap-3">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-white text-base">FarmGPT</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-4 flex-1">
          {ALL_NAV.map(({ href, icon: Icon, label }) => {
            const isActive = isActiveRoute(location, href);
            return (
              <Link key={href} href={href}>
                <button className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}>
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              </Link>
            );
          })}
        </nav>
        {/* Online indicator + mobile menu button */}
        <div className="ml-auto flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium",
            isOnline ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
          )}>
            {isOnline
              ? <><Wifi className="w-3 h-3" /><span className="hidden sm:inline">Online</span></>
              : <><WifiOff className="w-3 h-3" /><span className="hidden sm:inline">Offline</span></>
            }
          </div>
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-30 top-14 bg-black/20 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <div className="bg-background border-b border-border shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">All Features</p>
              {ALL_NAV.map(({ href, icon: Icon, label }) => {
                const isActive = isActiveRoute(location, href);
                return (
                  <Link key={href} href={href}>
                    <button className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}>
                      <Icon className="w-5 h-5 shrink-0" />
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="flex items-center justify-around px-2 h-16 max-w-lg mx-auto">
          {BOTTOM_NAV.map(({ href, icon: Icon, label, primary }) => {
            const isActive = isActiveRoute(location, href);
            return (
              <Link key={href} href={href}>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all",
                    primary
                      ? "w-14 h-14 -mt-5 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95"
                      : isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
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
