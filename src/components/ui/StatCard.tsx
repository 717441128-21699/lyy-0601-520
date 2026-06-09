import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'cyan' | 'pink' | 'green' | 'yellow' | 'red';
  delay?: number;
}

const colorClasses = {
  cyan: 'from-neon-cyan/20 to-neon-cyan/5 border-neon-cyan/30',
  pink: 'from-neon-pink/20 to-neon-pink/5 border-neon-pink/30',
  green: 'from-neon-green/20 to-neon-green/5 border-neon-green/30',
  yellow: 'from-neon-yellow/20 to-neon-yellow/5 border-neon-yellow/30',
  red: 'from-neon-red/20 to-neon-red/5 border-neon-red/30',
};

const iconColors = {
  cyan: 'text-neon-cyan',
  pink: 'text-neon-pink',
  green: 'text-neon-green',
  yellow: 'text-neon-yellow',
  red: 'text-neon-red',
};

export function StatCard({ title, value, icon: Icon, trend, color = 'cyan', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
      className={`glass-card p-6 bg-gradient-to-br ${colorClasses[color]} border`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 font-mono mb-1">{title}</p>
          <p className={`font-display text-3xl font-bold ${iconColors[color]}`}>{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend.isPositive ? 'text-neon-green' : 'text-neon-red'}`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-bg-dark/50 ${iconColors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
}
