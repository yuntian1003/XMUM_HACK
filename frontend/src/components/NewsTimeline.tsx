import { AlertTriangle, AlertCircle } from "lucide-react";

type NewsEvent = {
  id: string;
  title: string;
  date: string;
  severity: "critical" | "severe" | "moderate";
  commodity: string;
  sentiment?: "bullish" | "neutral" | "bearish";
};

type NewsTimelineProps = {
  events: NewsEvent[];
};

const severityConfig = {
  critical: {
    color: "text-red-700",
    bgColor: "bg-red-100",
    borderColor: "border-red-300",
    icon: AlertTriangle,
  },
  severe: {
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    borderColor: "border-orange-300",
    icon: AlertTriangle,
  },
  moderate: {
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-300",
    icon: AlertCircle,
  },
};

const sentimentColor = {
  bullish: "text-emerald-600",
  neutral: "text-slate-600",
  bearish: "text-red-600",
};

export default function NewsTimeline({ events }: NewsTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-slate-500 text-sm">No critical news at this time</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, idx) => {
        const config = severityConfig[event.severity];
        const Icon = config.icon;

        return (
          <div
            key={event.id}
            className={`relative pb-6 ${idx !== events.length - 1 ? "border-l-2 border-slate-200" : ""}`}
          >
            {/* Timeline dot */}
            <div className="absolute -left-3.5 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-slate-300" />

            {/* Content */}
            <div className="ml-6">
              <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4`}>
                <div className="flex items-start gap-2 mb-2">
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm leading-snug">{event.title}</p>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2 text-xs">
                  <span className={`font-semibold capitalize ${config.color}`}>
                    {event.severity}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-600">{event.date}</span>
                  <span className="text-slate-600">•</span>
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                    {event.commodity}
                  </span>
                  {event.sentiment && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className={`font-semibold capitalize ${sentimentColor[event.sentiment]}`}>
                        {event.sentiment}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
