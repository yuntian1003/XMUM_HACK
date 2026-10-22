import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { getLocalScans } from "@/lib/db";
import { LogOut, User, Cloud, Database, Info, Leaf, Warehouse, PenLine, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FARM_NAME_KEY = "agriguard-farm-name";
const DISPLAY_NAME_KEY = "agriguard-display-name";

export default function Profile() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [localCount, setLocalCount] = useState(0);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Personalization fields (stored in localStorage)
  const [farmName, setFarmName] = useState(() => localStorage.getItem(FARM_NAME_KEY) ?? "");
  const [displayName, setDisplayName] = useState(() => localStorage.getItem(DISPLAY_NAME_KEY) ?? "");
  const [editingProfile, setEditingProfile] = useState(false);
  const [editFarm, setEditFarm] = useState(farmName);
  const [editDisplay, setEditDisplay] = useState(displayName);

  // Use cached user from localStorage for instant display while tRPC query loads
  const cachedUser = (() => {
    try {
      const raw = localStorage.getItem("user-info");
      return raw && raw !== "null" ? JSON.parse(raw) : null;
    } catch { return null; }
  })();
  const effectiveUser = user ?? cachedUser;
  const effectiveAuth = isAuthenticated || Boolean(cachedUser?.name);

  const cloudStats = trpc.scans.stats.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation();
  const signupMutation = trpc.auth.signup.useMutation();

  useEffect(() => {
    getLocalScans(500).then((scans) => {
      setLocalCount(scans.length);
      setUnsyncedCount(scans.filter((s) => !s.synced).length);
    });
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out successfully.");
  };

  const handleLogin = async () => {
    try {
      await loginMutation.mutateAsync({ email, password });
      await utils.auth.me.invalidate();
      toast.success("Signed in successfully.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Login failed.";
      toast.error(msg);
    }
  };

  const handleSignup = async () => {
    try {
      await signupMutation.mutateAsync({
        name: name.trim() || "Farmer",
        email,
        password,
      });
      await utils.auth.me.invalidate();
      toast.success("Account created and signed in.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Sign up failed.";
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-4 max-w-lg mx-auto space-y-4">
      <h1 className="font-display font-bold text-xl text-foreground">Profile</h1>

      {/* Auth card */}
      {isAuthenticated ? (
        <>
          {/* Profile Identity Card */}
          <Card className="shadow-sm overflow-hidden">
            <div
              className="h-16"
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1a2744 50%, #0f2318 100%)",
              }}
            />
            <CardContent className="p-4 -mt-8">
              <div className="flex items-end justify-between gap-4 mb-3">
                {/* Avatar with initials */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center border-4 border-background shadow-md text-white font-bold text-xl shrink-0"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
                >
                  {(displayName || user?.name || "F").charAt(0).toUpperCase()}
                </div>
                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Signed in
                </span>
              </div>

              {editingProfile ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-display-name">Display Name</Label>
                    <Input
                      id="edit-display-name"
                      value={editDisplay}
                      onChange={e => setEditDisplay(e.target.value)}
                      placeholder={user?.name ?? "Your name"}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-farm-name">Farm / Organization Name</Label>
                    <Input
                      id="edit-farm-name"
                      value={editFarm}
                      onChange={e => setEditFarm(e.target.value)}
                      placeholder="e.g. Green Valley Farm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        localStorage.setItem(DISPLAY_NAME_KEY, editDisplay.trim());
                        localStorage.setItem(FARM_NAME_KEY, editFarm.trim());
                        setDisplayName(editDisplay.trim());
                        setFarmName(editFarm.trim());
                        setEditingProfile(false);
                        toast.success("Profile updated!");
                        // Notify other components via storage event
                        window.dispatchEvent(new StorageEvent("storage", { key: FARM_NAME_KEY }));
                        window.dispatchEvent(new StorageEvent("storage", { key: DISPLAY_NAME_KEY }));
                      }}
                    >
                      <Check className="w-3.5 h-3.5" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditFarm(farmName);
                      setEditDisplay(displayName);
                      setEditingProfile(false);
                    }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-lg text-foreground truncate">
                      {displayName || user?.name || "Farmer"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{user?.email ?? "No email"}</p>
                    {farmName && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Warehouse className="w-3.5 h-3.5 text-primary" />
                        <span className="text-sm font-medium text-primary">{farmName}</span>
                      </div>
                    )}
                    {!farmName && (
                      <p className="text-xs text-muted-foreground mt-1">No farm name set — tap edit to add one</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    onClick={() => {
                      setEditDisplay(displayName);
                      setEditFarm(farmName);
                      setEditingProfile(true);
                    }}
                  >
                    <PenLine className="w-3.5 h-3.5" /> Edit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="shadow-sm border-dashed">
          <CardContent className="p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <User className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Not signed in</p>
              <p className="text-sm text-muted-foreground mt-1">Use email/password to sign in or create an account.</p>
            </div>
            <div className="space-y-2 text-left">
              <div className="space-y-1">
                <Label htmlFor="name">Name (for sign up)</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 characters" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="w-full"
                disabled={!email || !password || loginMutation.isPending || signupMutation.isPending}
                onClick={handleLogin}
              >
                Sign In
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={!email || !password || !name || loginMutation.isPending || signupMutation.isPending}
                onClick={handleSignup}
              >
                Sign Up
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Storage stats */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            Storage & Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">Local scans</span>
            </div>
            <span className="font-semibold text-foreground">{localCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-foreground">Pending sync</span>
            </div>
            <span className={`font-semibold ${unsyncedCount > 0 ? "text-amber-600" : "text-green-600"}`}>
              {unsyncedCount > 0 ? `${unsyncedCount} scans` : "All synced ✓"}
            </span>
          </div>
          {isAuthenticated && cloudStats.data && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">Cloud scans</span>
              </div>
              <span className="font-semibold text-foreground">{cloudStats.data.total}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* App info */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            About AgriGuard
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium text-foreground">2.0.0 (Multi-Crop)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Track</span>
            <span className="font-medium text-foreground">PADI & PLATES</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">AI Engine</span>
            <span className="font-medium text-foreground">Edge AI (Browser ONNX)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Offline support</span>
            <span className="font-medium text-green-600">✓ Enabled</span>
          </div>
          <Separator className="my-2" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            AgriGuard detects diseases across 17 ASEAN crops with 80+ diseases using offline Edge AI. All analysis runs directly in your browser with no internet required.
          </p>
        </CardContent>
      </Card>

      {/* Supported crops */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base">Supported Crops</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <p className="text-xs text-muted-foreground">17 ASEAN crops with comprehensive disease detection:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {["Rice", "Cassava", "Corn", "Coconut", "Pineapple", "Tomato", "Cabbage", "Cacao", "Coffee", "Rubber", "Sugarcane", "Banana", "Mango", "Chili", "Soybean", "Sweet Potato", "Taro"].map((crop) => (
              <span key={crop} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">{crop}</span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sign out */}
      {isAuthenticated && (
        <div className="pb-4">
          <Button variant="outline" className="w-full h-12 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      )}
    </div>
  );
}
