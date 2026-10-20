import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Leaf, Home, Camera } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Leaf className="w-10 h-10 text-primary" />
      </div>
      <h1 className="font-display font-bold text-6xl text-primary mb-2">404</h1>
      <h2 className="font-display font-bold text-xl text-foreground mb-3">Page Not Found</h2>
      <p className="text-sm text-muted-foreground max-w-xs mb-8 leading-relaxed">
        This page doesn't exist. Head back to the field — your rice plants need attention!
      </p>
      <div className="flex gap-3">
        <Link href="/">
          <Button variant="outline" className="h-11">
            <Home className="w-4 h-4 mr-2" /> Go Home
          </Button>
        </Link>
        <Link href="/scan">
          <Button className="h-11">
            <Camera className="w-4 h-4 mr-2" /> Start Scanning
          </Button>
        </Link>
      </div>
    </div>
  );
}
