import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

interface DifficultyRadarProps {
  data: Array<{
    subject: string;
    value: number;
    fullMark: number;
  }>;
  color?: string;
}

export function DifficultyRadar({ data, color = '#00f0ff' }: DifficultyRadarProps) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="80%">
          <PolarGrid stroke="rgba(0, 240, 255, 0.2)" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#888', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 'dataMax']}
            tick={{ fill: '#666', fontSize: 10 }}
          />
          <Radar
            name="难度"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
