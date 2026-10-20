import { Camera, ClipboardList, History } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

type ScannerFamilySection = "capture" | "history" | "result";

const PRIMARY_ITEMS = [
  { key: "capture", href: "/scan", label: "Capture", icon: Camera },
  { key: "history", href: "/history", label: "History", icon: History },
] as const;

export default function ScannerFamilyNav({ active }: { active: ScannerFamilySection }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRIMARY_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;

        return (
          <Link key={item.key} href={item.href}>
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                  : "border-white/20 bg-white/10 text-white/85 hover:bg-white/15"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </span>
          </Link>
        );
      })}

      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold",
          active === "result"
            ? "border-emerald-200 bg-emerald-100 text-emerald-800"
            : "border-white/20 bg-white/10 text-white/65"
        )}
      >
        <ClipboardList className="h-4 w-4" />
        Result
      </span>
    </div>
  );
}
