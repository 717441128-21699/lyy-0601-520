import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'cyan' | 'pink' | 'green' | 'yellow' | 'red';
  showLabel?: boolean;
  label?: string;
  height?: number;
  animated?: boolean;
}

const colors = {
  cyan: 'bg-neon-cyan shadow-neon-cyan',
  pink: 'bg-neon-pink shadow-neon-pink',
  green: 'bg-neon-green shadow-neon-green',
  yellow: 'bg-neon-yellow shadow-neon-yellow',
  red: 'bg-neon-red shadow-neon-red',
};

export function ProgressBar({
  value,
  max = 100,
  color = 'cyan',
  showLabel = true,
  label,
  height = 8,
  animated = true,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-xs text-gray-400 font-mono">{label || `${Math.round(percentage)}%`}</span>
          <span className="text-xs text-gray-500 font-mono">{Math.round(value)}/{max}</span>
        </div>
      )}
      <div className="w-full h-full bg-bg-dark/50 rounded-full overflow-hidden" style={{ height }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: animated ? 0.8 : 0, ease: 'easeOut' }}
          className={`h-full ${colors[color]} rounded-full`}
        />
      </div>
    </div>
  );
}
