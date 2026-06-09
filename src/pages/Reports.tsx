import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '../store/useProjectStore';
import { useValidationStore } from '../store/useValidationStore';
import { StatCard } from '../components/ui/StatCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { DifficultyRadar } from '../components/charts/DifficultyRadar';
import { DensityChart } from '../components/charts/DensityChart';
import {
  FileBarChart,
  FileText,
  GitCompare,
  History,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  User,
  Music,
  Target,
  TrendingUp,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
  FileArchive,
  Search,
} from 'lucide-react';
import { compareVersions, exportToJSON } from '../utils/export/exportChart';
import { formatTime, formatBPM, getDifficultyColor, getSeverityColor } from '../utils/formatters';
import type { Chart, ValidationReport, EditHistory, VersionDiff } from '../types';

type TabType = 'issues' | 'compare' | 'history' | 'export';

export function Reports() {
  const { getCurrentProject, getCurrentSong, getCurrentChart, getEditHistory, charts, songs } = useProjectStore();
  const { reports, getLatestReport } = useValidationStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('issues');
  const [compareChartA, setCompareChartA] = useState<string>('');
  const [compareChartB, setCompareChartB] = useState<string>('');
  const [versionDiff, setVersionDiff] = useState<VersionDiff | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'add' | 'edit' | 'delete'>('all');

  const project = getCurrentProject();
  const song = getCurrentSong();
  const chart = getCurrentChart();
  const latestReport = chart ? getLatestReport(chart.id) : undefined;
  const history = project ? getEditHistory(project.id) : [];

  const projectCharts = charts.filter(c => c.projectId === project?.id);

  useEffect(() => {
    if (compareChartA && compareChartB) {
      const chartA = charts.find(c => c.id === compareChartA);
      const chartB = charts.find(c => c.id === compareChartB);
      if (chartA && chartB) {
        const diff = compareVersions(chartA, chartB);
        setVersionDiff(diff);
      }
    } else {
      setVersionDiff(null);
    }
  }, [compareChartA, compareChartB, charts]);

  const tabs = [
    { id: 'issues', label: '问题清单', icon: FileText },
    { id: 'compare', label: '版本对比', icon: GitCompare },
    { id: 'history', label: '修改记录', icon: History },
    { id: 'export', label: '导出报告', icon: Download },
  ];

  const filteredHistory = history.filter(record => {
    if (filterType !== 'all' && record.type !== filterType) return false;
    if (searchQuery && !record.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const errorCount = latestReport?.issues.filter(i => i.severity === 'error' && !i.isFixed).length || 0;
  const warningCount = latestReport?.issues.filter(i => i.severity === 'warning' && !i.isFixed).length || 0;
  const infoCount = latestReport?.issues.filter(i => i.severity === 'info' && !i.isFixed).length || 0;
  const fixedCount = latestReport?.issues.filter(i => i.isFixed).length || 0;

  const radarData = chart ? [
    { subject: '密度', value: (latestReport?.averageNPS || 0) * 1.5, fullMark: 20 },
    { subject: '节奏', value: (chart.notes.filter(n => n.type === 'swing').length / Math.max(chart.notes.length, 1)) * 15, fullMark: 20 },
    { subject: '复杂度', value: (chart.notes.filter(n => n.type === 'hold' || n.type === 'slide').length / Math.max(chart.notes.length, 1)) * 15, fullMark: 20 },
    { subject: '速度', value: (song?.bpm || 0) / 30, fullMark: 20 },
    { subject: '精准度', value: Math.max(0, 20 - (latestReport?.totalIssues || 0)), fullMark: 20 },
    { subject: '多样性', value: new Set(chart.notes.map(n => n.type)).size * 5, fullMark: 20 },
  ] : [];

  const densityData = Array.from({ length: 15 }, (_, i) => ({
    time: `${i * 10}s`,
    density: Math.floor(Math.random() * 6) + 2 + (i > 5 && i < 10 ? 8 : 0),
  }));

  const handleExportReport = () => {
    const reportData = {
      project,
      song,
      chart,
      validationReport: latestReport,
      editHistory: history,
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(reportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name || 'report'}_qa_report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportIssues = () => {
    if (!latestReport) return;
    
    let csv = '类型,严重程度,时间,轨道,描述,建议,已修复\n';
    latestReport.issues.forEach(issue => {
      csv += `"${issue.type}","${issue.severity}","${formatTime(issue.time)}","${issue.trackIndex ?? '-'}","${issue.description}","${issue.suggestion || ''}","${issue.isFixed ? '是' : '否'}"\n`;
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name || 'report'}_issues.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeIcons: Record<string, any> = {
    add: ArrowUpRight,
    delete: ArrowDownRight,
    edit: Minus,
  };

  const typeColors: Record<string, string> = {
    add: 'text-neon-green bg-neon-green/20',
    delete: 'text-neon-red bg-neon-red/20',
    edit: 'text-neon-yellow bg-neon-yellow/20',
  };

  const typeLabels: Record<string, string> = {
    add: '新增',
    delete: '删除',
    edit: '修改',
  };

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">报告</h1>
          <p className="text-gray-400 font-mono text-sm">问题清单、版本对比、修改记录</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportIssues}
            disabled={!latestReport}
            className="btn-neon flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            导出CSV
          </button>
          <button
            onClick={handleExportReport}
            className="btn-neon-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-4 gap-4">
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
      </div>

      <div className="flex items-center gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-4 py-3 font-mono text-sm transition-all relative ${
              activeTab === tab.id
                ? 'text-neon-cyan'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-cyan"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'issues' && (
          <motion.div
            key="issues"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-3 gap-6"
          >
            <div className="col-span-2 glass-card p-6">
              <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-neon-cyan" />
                问题清单
              </h3>
              {latestReport ? (
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-neon pr-2">
                  {latestReport.issues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`p-4 rounded-lg border-l-4 transition-all ${issue.isFixed ? 'opacity-60' : ''}`}
                      style={{ borderLeftColor: getSeverityColor(issue.severity) }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${getSeverityColor(issue.severity)}20`,
                                color: getSeverityColor(issue.severity),
                              }}
                            >
                              {issue.severity === 'error' ? '错误' : issue.severity === 'warning' ? '警告' : '提示'}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">
                              {formatTime(issue.time)}
                            </span>
                            {issue.trackIndex !== undefined && (
                              <span className="text-xs text-gray-500 font-mono">
                                轨道 {issue.trackIndex + 1}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-white font-mono">{issue.description}</p>
                          {issue.suggestion && (
                            <p className="text-xs text-gray-500 font-mono mt-1">
                              💡 {issue.suggestion}
                            </p>
                          )}
                        </div>
                        {issue.isFixed && (
                          <span className="text-xs text-neon-green font-mono px-2 py-1 rounded-full bg-neon-green/10">
                            已修复
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 font-mono">暂无校验报告</p>
                  <p className="text-xs text-gray-600 font-mono mt-1">请先运行规则校验</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="glass-card p-6">
                <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-neon-pink" />
                  质量评分
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-400 font-mono">整体质量</span>
                      <span className="text-neon-cyan font-mono font-bold">
                        {latestReport ? Math.round((1 - latestReport.totalIssues / Math.max(chart?.notes.length || 1, 1)) * 100) : '--'}%
                      </span>
                    </div>
                    <ProgressBar
                      value={latestReport ? (1 - latestReport.totalIssues / Math.max(chart?.notes.length || 1, 1)) * 100 : 0}
                      label=""
                      showLabel={false}
                      color="cyan"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-400 font-mono">修复率</span>
                      <span className="text-neon-green font-mono font-bold">
                        {latestReport && latestReport.totalIssues > 0
                          ? Math.round((fixedCount / latestReport.totalIssues) * 100)
                          : 0}%
                      </span>
                    </div>
                    <ProgressBar
                      value={latestReport && latestReport.totalIssues > 0
                        ? (fixedCount / latestReport.totalIssues) * 100
                        : 0}
                      label=""
                      showLabel={false}
                      color="green"
                    />
                  </div>
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-neon-green" />
                  难度分析
                </h3>
                {chart ? (
                  <DifficultyRadar data={radarData} color="#00f0ff" />
                ) : (
                  <p className="text-gray-500 text-center py-8 font-mono">请先选择谱面</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'compare' && (
          <motion.div
            key="compare"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-neon-pink" />
                版本对比
              </h3>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="text-sm text-gray-400 font-mono block mb-2">版本 A</label>
                  <select
                    value={compareChartA}
                    onChange={(e) => setCompareChartA(e.target.value)}
                    className="w-full bg-bg-dark/50 border border-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-neon-cyan"
                  >
                    <option value="">选择谱面...</option>
                    {projectCharts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 font-mono block mb-2">版本 B</label>
                  <select
                    value={compareChartB}
                    onChange={(e) => setCompareChartB(e.target.value)}
                    className="w-full bg-bg-dark/50 border border-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-neon-cyan"
                  >
                    <option value="">选择谱面...</option>
                    {projectCharts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {versionDiff ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-bg-dark/50 border border-border text-center">
                      <p className="text-xs text-gray-500 font-mono mb-1">新增音符</p>
                      <p className="text-2xl font-display font-bold text-neon-green">
                        +{versionDiff.addedNotes.length}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-bg-dark/50 border border-border text-center">
                      <p className="text-xs text-gray-500 font-mono mb-1">难度变化</p>
                      <p className={`text-2xl font-display font-bold ${
                        versionDiff.difficultyDiff > 0 ? 'text-neon-yellow' :
                        versionDiff.difficultyDiff < 0 ? 'text-neon-cyan' : 'text-gray-400'
                      }`}>
                        {versionDiff.difficultyDiff > 0 ? '+' : ''}{versionDiff.difficultyDiff}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-bg-dark/50 border border-border text-center">
                      <p className="text-xs text-gray-500 font-mono mb-1">相似度</p>
                      <p className="text-2xl font-display font-bold text-neon-cyan">
                        {versionDiff.similarity.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-bg-dark/50 border border-border text-center">
                      <p className="text-xs text-gray-500 font-mono mb-1">修改数量</p>
                      <p className="text-2xl font-display font-bold text-neon-pink">
                        {versionDiff.changes.length}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-bg-dark/50 border border-border">
                    <h4 className="text-sm text-white font-mono mb-3">变更详情</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-neon">
                      {versionDiff.changes.map((change, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-3 p-2 rounded ${
                            change.type === 'add' ? 'bg-neon-green/10' :
                            change.type === 'delete' ? 'bg-neon-red/10' : 'bg-neon-yellow/10'
                          }`}
                        >
                          {change.type === 'add' ? (
                            <ArrowUpRight className="w-4 h-4 text-neon-green" />
                          ) : change.type === 'delete' ? (
                            <ArrowDownRight className="w-4 h-4 text-neon-red" />
                          ) : (
                            <Minus className="w-4 h-4 text-neon-yellow" />
                          )}
                          <span className={`text-xs font-mono ${
                            change.type === 'add' ? 'text-neon-green' :
                            change.type === 'delete' ? 'text-neon-red' : 'text-neon-yellow'
                          }`}>
                            {change.type === 'add' ? '新增' : change.type === 'delete' ? '删除' : '修改'}
                          </span>
                          <span className="text-xs text-white font-mono flex-1">{change.description}</span>
                          <span className="text-xs text-gray-500 font-mono">
                            {formatTime(change.time || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <GitCompare className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 font-mono">选择两个谱面进行对比</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-neon-green" />
                修改记录
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {(['all', 'add', 'edit', 'delete'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                        filterType === type
                          ? type === 'add' ? 'bg-neon-green/20 text-neon-green' :
                            type === 'delete' ? 'bg-neon-red/20 text-neon-red' :
                            type === 'edit' ? 'bg-neon-yellow/20 text-neon-yellow' :
                            'bg-neon-cyan/20 text-neon-cyan'
                          : 'bg-bg-dark/50 text-gray-400 hover:text-white'
                      }`}
                    >
                      {type === 'all' ? '全部' : typeLabels[type]}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="搜索记录..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-bg-dark/50 border border-border rounded-lg text-sm text-white font-mono focus:outline-none focus:border-neon-cyan"
                  />
                </div>
              </div>
            </div>

            {filteredHistory.length > 0 ? (
              <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-4">
                  {filteredHistory.map((record) => {
                    const Icon = typeIcons[record.type] || Minus;
                    return (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative pl-20"
                      >
                        <div className={`absolute left-6 w-5 h-5 rounded-full flex items-center justify-center ${typeColors[record.type]}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <div className="p-4 rounded-lg bg-bg-dark/50 border border-border hover:border-neon-cyan/30 transition-all">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColors[record.type]}`}>
                                  {typeLabels[record.type]}
                                </span>
                                <span className="text-sm text-white font-mono">{record.description}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(record.timestamp).toLocaleString('zh-CN')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {record.user}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 font-mono">暂无修改记录</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'export' && (
          <motion.div
            key="export"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-2 gap-6"
          >
            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-neon-cyan" />
                导出选项
              </h3>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-bg-dark/50 border border-border hover:border-neon-cyan/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-neon-cyan" />
                    <span className="text-white font-mono">质检报告 (JSON)</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">
                    包含所有校验结果、修改记录和谱面信息
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-bg-dark/50 border border-border hover:border-neon-cyan/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <FileBarChart className="w-5 h-5 text-neon-pink" />
                    <span className="text-white font-mono">问题清单 (CSV)</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">
                    可在Excel中打开的问题列表表格
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-bg-dark/50 border border-border hover:border-neon-cyan/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <FileArchive className="w-5 h-5 text-neon-green" />
                    <span className="text-white font-mono">谱面文件 (多种格式)</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">
                    支持 JSON、OSU、BMS 等标准格式
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-card p-6">
                <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-neon-yellow" />
                  项目摘要
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-gray-400 font-mono text-sm">项目名称</span>
                    <span className="text-white font-mono">{project?.name || '--'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-gray-400 font-mono text-sm">创建者</span>
                    <span className="text-white font-mono">{project?.creator || '--'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-gray-400 font-mono text-sm">歌曲</span>
                    <span className="text-white font-mono">{song?.title || '--'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-gray-400 font-mono text-sm">BPM</span>
                    <span className="text-neon-cyan font-mono font-bold">{song?.bpm || '--'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-gray-400 font-mono text-sm">谱面</span>
                    <span className="text-white font-mono">{chart?.name || '--'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-gray-400 font-mono text-sm">难度</span>
                    <span className="font-mono font-bold" style={{ color: getDifficultyColor(chart?.difficultyLevel || 0) }}>
                      Lv.{chart?.difficultyLevel || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-gray-400 font-mono text-sm">音符总数</span>
                    <span className="text-neon-cyan font-mono font-bold">{chart?.notes.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-400 font-mono text-sm">导出时间</span>
                    <span className="text-white font-mono">{new Date().toLocaleString('zh-CN')}</span>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-neon-green" />
                  音符密度
                </h3>
                <DensityChart data={densityData} threshold={12} color="#ff00aa" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
