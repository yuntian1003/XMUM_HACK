import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type PriceTrendDataPoint = {
  date: string;
  [key: string]: string | number; // commodity names as keys with prices
};

type CommodityPriceTrendProps = {
  data: PriceTrendDataPoint[];
  commodities?: string[];
  height?: number;
};

const commodityColors: { [key: string]: string } = {
  rice: "#d97706",
  wheat: "#3b82f6",
  maize: "#10b981",
  pulses: "#f59e0b",
  oil: "#8b5cf6",
  sugar: "#ec4899",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg border border-slate-700">
        <p className="text-sm font-semibold text-slate-100">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">MYR {entry.value.toFixed(2)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function CommodityPriceTrendChart({ 
  data, 
  commodities = ["rice", "wheat", "maize"],
  height = 350 
}: CommodityPriceTrendProps) {
  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-slate-500">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          interval={Math.floor(data.length / 8)}
        />
        <YAxis 
          label={{ value: "Price (MYR/unit)", angle: -90, position: "insideLeft" }}
          tick={{ fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ paddingTop: "20px" }}
          iconType="line"
        />

        {commodities.map((commodity) => (
          <Line
            key={commodity}
            type="monotone"
            dataKey={commodity}
            stroke={commodityColors[commodity] || "#64748b"}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
            isAnimationActive={true}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
