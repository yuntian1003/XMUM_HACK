import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts";

type CfsrDataPoint = {
  date: string;
  cfsr: number;
  riskBand: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  confidence?: number | null;
  coverage?: number | null;
};

type CfsrHistoryChartProps = {
  data: CfsrDataPoint[];
  height?: number;
};

const riskBandColor = (band: string) => {
  if (band === "LOW") return "#10b981";
  if (band === "MODERATE") return "#f59e0b";
  if (band === "CRITICAL") return "#dc2626";
  return "#ef4444";
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 text-slate-900 shadow-lg">
        <p className="text-sm font-semibold">{data.date}</p>
        <p className="text-sm">CFSR: <span className="font-bold">{data.cfsr.toFixed(1)}</span></p>
        {data.confidence !== null && data.confidence !== undefined ? (
          <p className="text-sm">Confidence: <span className="font-bold">{(data.confidence * 100).toFixed(0)}%</span></p>
        ) : null}
        {data.coverage !== null && data.coverage !== undefined ? (
          <p className="text-sm">Coverage: <span className="font-bold">{(data.coverage * 100).toFixed(0)}%</span></p>
        ) : null}
        <p className="text-sm font-semibold" style={{ color: riskBandColor(data.riskBand) }}>
          {data.riskBand}
        </p>
      </div>
    );
  }
  return null;
};

export default function CfsrHistoryChart({ data, height = 300 }: CfsrHistoryChartProps) {
  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-slate-500">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 12, right: 30, left: 0, bottom: 0 }}>
        <ReferenceArea y1={70} y2={100} fill="#ecfdf5" fillOpacity={0.8} />
        <ReferenceArea y1={40} y2={70} fill="#fffbeb" fillOpacity={0.8} />
        <ReferenceArea y1={0} y2={40} fill="#fef2f2" fillOpacity={0.8} />
        <ReferenceLine y={70} stroke="#10b981" strokeDasharray="5 5" label={{ value: "LOW RISK (70+)", position: "right", fill: "#047857", fontSize: 12 }} />
        <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: "MODERATE (40-70)", position: "right", fill: "#b45309", fontSize: 12 }} />

        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          interval={Math.floor(data.length / 6)}
        />
        <YAxis 
          domain={[0, 100]}
          label={{ value: "CFSR Score", angle: -90, position: "insideLeft" }}
          tick={{ fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />

        <Line
          type="monotone" 
          dataKey="cfsr" 
          stroke="#2563eb"
          strokeWidth={3}
          dot={(dotProps: any) => {
            const confidence = Number(dotProps?.payload?.confidence);
            const opacity = Number.isFinite(confidence) ? Math.max(0.35, Math.min(1, confidence)) : 1;
            return <circle cx={dotProps.cx} cy={dotProps.cy} r={4} fill="#2563eb" fillOpacity={opacity} stroke="#ffffff" strokeWidth={1.5} />;
          }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
