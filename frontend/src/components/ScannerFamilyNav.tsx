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
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-all shadow-sm",
                isActive
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-3.5 w-3.5 text-emerald-600" />
              {item.label}
            </span>
          </Link>
        );
      })}

      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-all shadow-sm",
          active === "result"
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-slate-200 bg-white text-slate-400"
        )}
      >
        <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
        Result
      </span>
    </div>
  );
}
