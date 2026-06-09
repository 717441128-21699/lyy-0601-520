import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '../store/useProjectStore';
import { useValidationStore } from '../store/useValidationStore';
import { useEditorStore } from '../store/useEditorStore';
import { IssueCard } from '../components/ui/IssueCard';
import { StatCard } from '../components/ui/StatCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { DensityChart } from '../components/charts/DensityChart';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  RefreshCw,
  Wrench,
  Filter,
  Search,
  Zap,
  Target,
  TrendingUp,
  BarChart3,
  CheckSquare,
  Clock,
} from 'lucide-react';
import { validateChart, autoFixIssue, autoFixAllIssues } from '../utils/validation/validationRules';
import { formatTime, getDifficultyColor, getSeverityColor } from '../utils/formatters';
import type { ValidationIssue, ValidationReport } from '../types';

type SeverityFilter = 'all' | 'error' | 'warning' | 'info';
type TypeFilter = 'all' | string;

export function Validation() {
  const { getCurrentChart, updateChart, addEditHistory } = useProjectStore();
  const { reports, addReport, updateIssue, markIssueFixed, getLatestReport } = useValidationStore();
  const { setCurrentTime } = useEditorStore();
  
  const [isValidating, setIsValidating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [showFixed, setShowFixed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentReport, setCurrentReport] = useState<ValidationReport | null>(null);

  const chart = getCurrentChart();
  const latestReport = chart ? getLatestReport(chart.id) : undefined;

  useEffect(() => {
    if (chart) {
      const report = validateChart(chart);
      setCurrentReport(report);
    }
  }, [chart]);

  const handleValidate = async () => {
    if (!chart) return;
    
    setIsValidating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const report = validateChart(chart);
    addReport(report);
    setCurrentReport(report);
    
    addEditHistory({
      projectId: chart.projectId,
      chartId: chart.id,
      action: 'validate_chart',
      description: `运行规则校验，发现 ${report.totalIssues} 个问题`,
      user: '谱师',
    });
    
    setIsValidating(false);
  };

  const handleFixIssue = async (issueId: string) => {
    if (!chart || !currentReport) return;
    
    const issue = currentReport.issues.find(i => i.id === issueId);
    if (!issue) return;
    
    const result = autoFixIssue(chart, issue);
    if (result.fixed) {
      updateChart(chart.id, { notes: result.chart.notes });
      updateIssue(chart.id, issueId, { isFixed: true });
      
      const newReport = validateChart(result.chart);
      setCurrentReport(newReport);
      
      addEditHistory({
        projectId: chart.projectId,
        chartId: chart.id,
        action: 'fix_issue',
        description: `自动修复问题: ${issue.description}`,
        user: '谱师',
      });
    }
  };

  const handleFixAll = async () => {
    if (!chart || !currentReport) return;
    
    setIsFixing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const result = autoFixAllIssues(chart);
    updateChart(chart.id, { notes: result.chart.notes });
    
    const newReport = validateChart(result.chart);
    setCurrentReport(newReport);
    
    currentReport.issues.forEach(issue => {
      if (!issue.isFixed) {
        updateIssue(chart.id, issue.id, { isFixed: true });
      }
    });
    
    addEditHistory({
      projectId: chart.projectId,
      chartId: chart.id,
      action: 'fix_all_issues',
      description: `批量修复 ${result.fixedCount} 个问题，失败 ${result.failedCount} 个`,
      user: '谱师',
    });
    
    setIsFixing(false);
  };

  const handleMarkFixed = (issueId: string) => {
    if (chart) {
      markIssueFixed(chart.id, issueId);
      if (currentReport) {
        setCurrentReport({
          ...currentReport,
          issues: currentReport.issues.map(i => 
            i.id === issueId ? { ...i, isFixed: true } : i
          ),
        });
      }
    }
  };

  const handleJumpToIssue = (issue: ValidationIssue) => {
    setCurrentTime(issue.time);
  };

  const filteredIssues = currentReport?.issues.filter(issue => {
    if (!showFixed && issue.isFixed) return false;
    if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
    if (typeFilter !== 'all' && issue.type !== typeFilter) return false;
    if (searchQuery && !issue.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }) || [];

  const errorCount = currentReport?.issues.filter(i => i.severity === 'error' && !i.isFixed).length || 0;
  const warningCount = currentReport?.issues.filter(i => i.severity === 'warning' && !i.isFixed).length || 0;
  const infoCount = currentReport?.issues.filter(i => i.severity === 'info' && !i.isFixed).length || 0;
  const fixedCount = currentReport?.issues.filter(i => i.isFixed).length || 0;

  const densityData = Array.from({ length: 15 }, (_, i) => ({
    time: `${i * 10}s`,
    density: Math.floor(Math.random() * 6) + 2 + (i > 5 && i < 10 ? 8 : 0),
  }));

  const typeCounts = currentReport?.issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">规则校验</h1>
          <p className="text-gray-400 font-mono text-sm">检查谱面问题，自动修复常见错误</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleFixAll}
            disabled={isFixing || !currentReport || currentReport.issues.every(i => i.isFixed)}
            className="btn-neon flex items-center gap-2"
          >
            {isFixing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Wrench className="w-4 h-4" />
            )}
            {isFixing ? '修复中...' : '一键修复'}
          </button>
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="btn-neon-primary flex items-center gap-2"
          >
            {isValidating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            {isValidating ? '校验中...' : '开始校验'}
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-5 gap-4">
        <StatCard
          title="错误"
          value={errorCount}
          icon={AlertCircle}
          color="red"
          delay={0.1}
        />
        <StatCard
          title="警告"
          value={warningCount}
          icon={AlertTriangle}
          color="yellow"
          delay={0.2}
        />
        <StatCard
          title="提示"
          value={infoCount}
          icon={Info}
          color="cyan"
          delay={0.3}
        />
        <StatCard
          title="已修复"
          value={fixedCount}
          icon={CheckCircle2}
          color="green"
          delay={0.4}
        />
        <StatCard
          title="预估难度"
          value={`Lv.${currentReport?.estimatedDifficulty || 0}`}
          icon={Target}
          color="pink"
          delay={0.5}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-6"
        >
          <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-neon-cyan" />
            校验进度
          </h3>
          <div className="space-y-4">
            <ProgressBar
              value={currentReport ? (fixedCount / Math.max(currentReport.totalIssues, 1)) * 100 : 0}
              label="修复进度"
              color="green"
            />
            <ProgressBar
              value={currentReport?.averageNPS || 0}
              max={20}
              label="平均NPS"
              color="cyan"
            />
            <ProgressBar
              value={currentReport?.maxNPS || 0}
              max={30}
              label="峰值NPS"
              color="pink"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-6"
        >
          <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-neon-pink" />
            问题类型分布
          </h3>
          <div className="space-y-3">
            {Object.entries(typeCounts).map(([type, count], i) => (
              <div key={type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400 font-mono">
                    {type === 'overlap' ? '重叠音符' :
                     type === 'too_dense' ? '过密段落' :
                     type === 'misaligned' ? '对齐问题' :
                     type === 'timing_error' ? '时序错误' :
                     type === 'difficulty_spike' ? '难度突增' :
                     type === 'empty_measure' ? '空小节' :
                     type === 'missing_sound' ? '缺失音效' : type}
                  </span>
                  <span className="text-xs text-white font-mono">{count}</span>
                </div>
                <ProgressBar
                  value={count}
                  max={Math.max(...Object.values(typeCounts), 1)}
                  label=""
                  showLabel={false}
                  color={['cyan', 'pink', 'green', 'yellow', 'red'][i % 5] as any}
                />
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-card p-6"
        >
          <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-neon-yellow" />
            音符密度
          </h3>
          <DensityChart data={densityData} threshold={12} color="#ff3366" />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="glass-card p-4"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400 font-mono">筛选:</span>
            <div className="flex items-center gap-1">
              {(['all', 'error', 'warning', 'info'] as SeverityFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                    severityFilter === s
                      ? s === 'all' ? 'bg-neon-cyan/20 text-neon-cyan' :
                        s === 'error' ? 'bg-neon-red/20 text-neon-red' :
                        s === 'warning' ? 'bg-neon-yellow/20 text-neon-yellow' :
                        'bg-neon-cyan/20 text-neon-cyan'
                      : 'bg-bg-dark/50 text-gray-400 hover:text-white'
                  }`}
                >
                  {s === 'all' ? '全部' :
                   s === 'error' ? '错误' :
                   s === 'warning' ? '警告' : '提示'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFixed}
                onChange={(e) => setShowFixed(e.target.checked)}
                className="w-4 h-4 accent-neon-green"
              />
              <span className="text-xs text-gray-400 font-mono">显示已修复</span>
            </label>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索问题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-bg-dark/50 border border-border rounded-lg text-sm text-white font-mono focus:outline-none focus:border-neon-cyan w-64"
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-neon-green" />
            问题列表
            <span className="text-sm text-gray-400 font-mono">
              ({filteredIssues.length} 个问题)
            </span>
          </h3>
        </div>

        <AnimatePresence mode="popLayout">
          {filteredIssues.length > 0 ? (
            filteredIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onFix={handleFixIssue}
                onMarkFixed={handleMarkFixed}
                onJump={handleJumpToIssue}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-12 text-center"
            >
              <CheckCircle2 className="w-16 h-16 text-neon-green mx-auto mb-4" />
              <p className="text-white font-mono text-lg">太棒了！</p>
              <p className="text-gray-400 font-mono text-sm mt-2">
                {currentReport && currentReport.totalIssues > 0
                  ? '所有问题已修复'
                  : '未发现任何问题'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {(isValidating || isFixing) && (
        <div className="fixed inset-0 bg-bg-dark/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-8 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 border-4 border-neon-cyan border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-white font-mono text-lg">
              {isValidating ? '正在校验谱面...' : '正在批量修复...'}
            </p>
            <p className="text-gray-400 font-mono text-sm mt-2">
              {isValidating ? '检查所有校验规则' : '自动修复可修复的问题'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
