import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface DensityChartProps {
  data: Array<{
    time: string;
    density: number;
    threshold?: number;
  }>;
  threshold?: number;
  color?: string;
}

export function DensityChart({ data, threshold = 12, color = '#ff00aa' }: DensityChartProps) {
  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorDensity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 240, 255, 0.1)" />
          <XAxis 
            dataKey="time" 
            stroke="#666" 
            tick={{ fill: '#888', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          />
          <YAxis 
            stroke="#666" 
            tick={{ fill: '#888', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(10, 10, 31, 0.95)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '8px',
              fontFamily: 'JetBrains Mono',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#00f0ff' }}
            itemStyle={{ color: '#fff' }}
          />
          <ReferenceLine 
            y={threshold} 
            stroke="#ff3366" 
            strokeDasharray="5 5" 
            label={{ value: `阈值 ${threshold} NPS`, fill: '#ff3366', fontSize: 10 }}
          />
          <Area
            type="monotone"
            dataKey="density"
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorDensity)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
