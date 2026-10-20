type StatePriceHeatmapProps = {
  data: {
    states: string[];
    commodities: string[];
    values: number[][];
  };
};

const getHeatmapColor = (value: number, min: number, max: number): string => {
  const normalized = (value - min) / (max - min);
  
  if (normalized < 0.2) return "#dcfce7"; // Very low - light green
  if (normalized < 0.4) return "#86efac"; // Low - medium green
  if (normalized < 0.6) return "#fbbf24"; // Medium - amber
  if (normalized < 0.8) return "#fb923c"; // High - orange
  return "#ef4444"; // Very high - red
};

const getLabelColor = (value: number, min: number, max: number): string => {
  const normalized = (value - min) / (max - min);
  return normalized > 0.5 ? "#ffffff" : "#1e293b";
};

export default function StatePriceHeatmap({ data }: StatePriceHeatmapProps) {
  if (!data || data.states.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        No data available
      </div>
    );
  }

  const allValues = data.values.flat();
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Header row with commodities */}
        <div className="flex">
          <div className="w-24 flex-shrink-0" /> {/* Empty cell for state labels */}
          {data.commodities.map((commodity) => (
            <div
              key={commodity}
              className="w-20 h-10 flex items-center justify-center text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200"
            >
              {commodity}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {data.states.map((state, stateIdx) => (
          <div key={state} className="flex">
            {/* State label */}
            <div className="w-24 flex-shrink-0 flex items-center px-3 py-2 font-medium text-sm text-slate-700 bg-slate-50 border border-slate-200 truncate">
              {state}
            </div>

            {/* Heatmap cells */}
            {data.values[stateIdx].map((value, commodityIdx) => {
              const bgColor = getHeatmapColor(value, min, max);
              const textColor = getLabelColor(value, min, max);

              return (
                <div
                  key={`${stateIdx}-${commodityIdx}`}
                  className="w-20 h-12 flex items-center justify-center border border-slate-200 group relative cursor-pointer transition-transform hover:scale-110 hover:z-10"
                  style={{ backgroundColor: bgColor }}
                >
                  <span
                    className="text-xs font-semibold text-center px-1"
                    style={{ color: textColor }}
                  >
                    {value.toFixed(2)}
                  </span>

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <div className="bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {state} - {data.commodities[commodityIdx]}: MYR {value.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="mt-4 flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Price Range:</span>
          <div className="flex gap-1">
            {[
              { color: "#dcfce7", label: "Very Low" },
              { color: "#86efac", label: "Low" },
              { color: "#fbbf24", label: "Medium" },
              { color: "#fb923c", label: "High" },
              { color: "#ef4444", label: "Very High" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <div
                  className="w-4 h-4 border border-slate-300 rounded"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
