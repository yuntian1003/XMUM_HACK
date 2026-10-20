import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

type SentimentData = {
  bullish: number;
  neutral: number;
  bearish: number;
};

type SentimentTrendPoint = {
  date: string;
  bullish: number;
  neutral: number;
  bearish: number;
};

type SentimentDistributionProps = {
  current: SentimentData;
  trend?: SentimentTrendPoint[];
  height?: number;
};

const COLORS = {
  bullish: "#10b981",
  neutral: "#64748b",
  bearish: "#ef4444",
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-900 text-white p-2 rounded-lg shadow-lg border border-slate-700">
        <p className="text-sm font-semibold">{data.name}</p>
        <p className="text-sm">
          <span className="font-bold">{data.value}</span> articles
          {" "}
          (<span className="font-bold">{((data.value / (data.payload.bullish + data.payload.neutral + data.payload.bearish)) * 100).toFixed(1)}%</span>)
        </p>
      </div>
    );
  }
  return null;
};

const CustomLineTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const date = payload[0].payload.date;
    return (
      <div className="bg-slate-900 text-white p-2 rounded-lg shadow-lg border border-slate-700">
        <p className="text-sm font-semibold">{date}</p>
        {payload.map((item: any) => (
          <p key={item.name} className="text-sm" style={{ color: COLORS[item.name as keyof typeof COLORS] }}>
            {item.name}: <span className="font-bold">{item.value}%</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SentimentDistribution({ 
  current, 
  trend, 
  height = 320 
}: SentimentDistributionProps) {
  const totalArticles = current.bullish + current.neutral + current.bearish;

  const pieData = [
    { name: "Bullish", value: current.bullish },
    { name: "Neutral", value: current.neutral },
    { name: "Bearish", value: current.bearish },
  ];

  const displayTrend = trend && trend.length > 0;

  return (
    <div className="space-y-4">
      {/* Current Distribution */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Current Sentiment Distribution</h3>
        
        {totalArticles === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500">
            No articles available
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Pie Chart */}
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => {
                    const percent = ((value / totalArticles) * 100).toFixed(1);
                    return `${name}: ${percent}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill={COLORS.bullish} />
                  <Cell fill={COLORS.neutral} />
                  <Cell fill={COLORS.bearish} />
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Stats Cards */}
            <div className="flex flex-col justify-center gap-3">
              {[
                { label: "Bullish", value: current.bullish, color: COLORS.bullish },
                { label: "Neutral", value: current.neutral, color: COLORS.neutral },
                { label: "Bearish", value: current.bearish, color: COLORS.bearish },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{item.value}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {((item.value / totalArticles) * 100).toFixed(1)}% of articles
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Trend Chart */}
      {displayTrend && trend.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-2">7-Day Sentiment Trend</h3>
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={trend} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval={Math.floor(trend.length / 4)}
              />
              <YAxis 
                label={{ value: "Percentage (%)", angle: -90, position: "insideLeft" }}
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomLineTooltip />} />

              <Line
                type="monotone"
                dataKey="bullish"
                stroke={COLORS.bullish}
                strokeWidth={2}
                dot={false}
                name="Bullish"
              />
              <Line
                type="monotone"
                dataKey="neutral"
                stroke={COLORS.neutral}
                strokeWidth={2}
                dot={false}
                name="Neutral"
              />
              <Line
                type="monotone"
                dataKey="bearish"
                stroke={COLORS.bearish}
                strokeWidth={2}
                dot={false}
                name="Bearish"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
