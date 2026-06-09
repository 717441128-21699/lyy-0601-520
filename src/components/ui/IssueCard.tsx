import { motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, Check, Wrench, X } from 'lucide-react';
import type { ValidationIssue } from '../../types';
import { formatTime, getSeverityColor } from '../../utils/formatters';

interface IssueCardProps {
  issue: ValidationIssue;
  onFix?: (issueId: string) => void;
  onMarkFixed?: (issueId: string) => void;
  onJump?: (issue: ValidationIssue) => void;
}

const severityIcons = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const severityLabels = {
  error: '错误',
  warning: '警告',
  info: '提示',
};

const typeLabels: Record<string, string> = {
  overlap: '重叠音符',
  too_dense: '过密段落',
  misaligned: '对齐问题',
  timing_error: '时序错误',
  difficulty_spike: '难度突增',
  empty_measure: '空小节',
  missing_sound: '缺失音效',
};

export function IssueCard({ issue, onFix, onMarkFixed, onJump }: IssueCardProps) {
  const Icon = severityIcons[issue.severity];
  const color = getSeverityColor(issue.severity);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`glass-card p-4 border-l-4 transition-all hover:shadow-lg ${issue.isFixed ? 'opacity-60' : ''}`}
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20`, color }}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
              {severityLabels[issue.severity]}
            </span>
            <span className="text-xs text-gray-500 font-mono">
              {typeLabels[issue.type] || issue.type}
            </span>
            <span className="text-xs text-gray-500 font-mono ml-auto">
              {formatTime(issue.time)}
            </span>
          </div>
          
          <p className="text-sm text-gray-300 font-mono mb-2">{issue.description}</p>
          
          {issue.suggestion && (
            <p className="text-xs text-gray-500 font-mono">
              💡 建议: {issue.suggestion}
            </p>
          )}

          {issue.trackIndex !== undefined && (
            <p className="text-xs text-gray-500 font-mono mt-1">
              🎯 轨道: {issue.trackIndex + 1}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onJump && (
            <button
              onClick={() => onJump(issue)}
              className="p-2 rounded-lg hover:bg-neon-cyan/10 text-gray-400 hover:text-neon-cyan transition-colors"
              title="跳转到位置"
            >
              <Wrench className="w-4 h-4" />
            </button>
          )}
          
          {!issue.isFixed && onFix && (
            <button
              onClick={() => onFix(issue.id)}
              className="p-2 rounded-lg hover:bg-neon-green/10 text-gray-400 hover:text-neon-green transition-colors"
              title="自动修复"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          
          {!issue.isFixed && onMarkFixed && (
            <button
              onClick={() => onMarkFixed(issue.id)}
              className="p-2 rounded-lg hover:bg-neon-yellow/10 text-gray-400 hover:text-neon-yellow transition-colors"
              title="标记为已修复"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {issue.isFixed && (
            <span className="text-xs text-neon-green font-mono px-2 py-1 rounded-full bg-neon-green/10">
              已修复
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
