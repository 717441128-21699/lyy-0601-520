import { useState } from 'react';
import { motion } from 'framer-motion';
import { useProjectStore } from '../store/useProjectStore';
import { StatCard } from '../components/ui/StatCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import {
  Layers,
  MoveHorizontal,
  Volume2,
  FileText,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Music,
  Clock,
  Target,
  Settings,
  Trash2,
  Copy,
  ChevronRight,
  FolderOpen,
  FileArchive,
} from 'lucide-react';
import { formatTime, sanitizeFileName } from '../utils/formatters';
import { batchExportCharts, exportToJSON } from '../utils/export/exportChart';
import type { Chart, Song } from '../types';

interface BatchTask {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
  config: Record<string, any>;
}

export function Batch() {
  const { projects, songs, charts, getCurrentProject, getCurrentSong, getCurrentChart, updateChart, addEditHistory } = useProjectStore();
  
  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; messages: string[] }>({ success: 0, failed: 0, messages: [] });

  const [tasks, setTasks] = useState<BatchTask[]>([
    {
      id: 'offset',
      name: '调整整体偏移',
      description: '批量调整所有音符的时间偏移',
      icon: MoveHorizontal,
      enabled: false,
      config: { offset: 0 },
    },
    {
      id: 'sound',
      name: '替换音效',
      description: '批量替换所有音符的打击音效',
      icon: Volume2,
      enabled: false,
      config: { oldSound: '', newSound: 'normal' },
    },
    {
      id: 'rename',
      name: '统一命名资源',
      description: '按照规则重命名所有资源文件',
      icon: FileText,
      enabled: false,
      config: { pattern: '{artist}_{title}_{difficulty}' },
    },
    {
      id: 'export',
      name: '批量导出关卡包',
      description: '导出选中的谱面为标准格式',
      icon: Download,
      enabled: true,
      config: { format: 'json', includeAssets: true },
    },
  ]);

  const project = getCurrentProject();
  const song = getCurrentSong();
  const chart = getCurrentChart();

  const projectCharts = charts.filter(c => c.projectId === project?.id);
  const projectSongs = songs.filter(s => s.projectId === project?.id);

  const handleChartSelect = (chartId: string) => {
    setSelectedCharts(prev => 
      prev.includes(chartId) 
        ? prev.filter(id => id !== chartId)
        : [...prev, chartId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCharts.length === projectCharts.length) {
      setSelectedCharts([]);
    } else {
      setSelectedCharts(projectCharts.map(c => c.id));
    }
  };

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, enabled: !t.enabled } : t
    ));
  };

  const updateTaskConfig = (taskId: string, key: string, value: any) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, config: { ...t.config, [key]: value } } : t
    ));
  };

  const executeBatch = async () => {
    if (selectedCharts.length === 0) return;
    
    setIsProcessing(true);
    setProcessProgress(0);
    setShowResults(false);
    setResults({ success: 0, failed: 0, messages: [] });
    
    const enabledTasks = tasks.filter(t => t.enabled);
    const totalSteps = selectedCharts.length * enabledTasks.length;
    let currentStep = 0;

    for (const chartId of selectedCharts) {
      const chartData = charts.find(c => c.id === chartId);
      if (!chartData) continue;

      for (const task of enabledTasks) {
        setCurrentTask(`${task.name}: ${chartData.name}`);
        currentStep++;
        setProcessProgress((currentStep / totalSteps) * 100);
        
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
          if (task.id === 'offset') {
            const offset = task.config.offset / 1000;
            const updatedNotes = chartData.notes.map(n => ({
              ...n,
              time: Math.max(0, n.time + offset),
            }));
            updateChart(chartId, { notes: updatedNotes });
            setResults(prev => ({
              ...prev,
              success: prev.success + 1,
              messages: [...prev.messages, `✓ ${chartData.name}: 偏移调整完成`],
            }));
          } else if (task.id === 'sound') {
            const updatedNotes = chartData.notes.map(n => 
              n.hitSound === task.config.oldSound || task.config.oldSound === ''
                ? { ...n, hitSound: task.config.newSound }
                : n
            );
            updateChart(chartId, { notes: updatedNotes });
            setResults(prev => ({
              ...prev,
              success: prev.success + 1,
              messages: [...prev.messages, `✓ ${chartData.name}: 音效替换完成`],
            }));
          } else if (task.id === 'rename') {
            const songData = songs.find(s => s.id === chartData.songId);
            const newName = task.config.pattern
              .replace('{artist}', sanitizeFileName(songData?.artist || 'unknown'))
              .replace('{title}', sanitizeFileName(songData?.title || 'unknown'))
              .replace('{difficulty}', chartData.difficulty.toString());
            updateChart(chartId, { name: newName });
            setResults(prev => ({
              ...prev,
              success: prev.success + 1,
              messages: [...prev.messages, `✓ ${chartData.name}: 重命名为 ${newName}`],
            }));
          } else if (task.id === 'export') {
            const songData = songs.find(s => s.id === chartData.songId);
            const json = exportToJSON(chartData, songData);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${sanitizeFileName(chartData.name)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            setResults(prev => ({
              ...prev,
              success: prev.success + 1,
              messages: [...prev.messages, `✓ ${chartData.name}: 导出完成`],
            }));
          }

          addEditHistory({
            projectId: chartData.projectId,
            chartId: chartId,
            action: 'batch_operation',
            type: 'edit',
            description: `批量操作: ${task.name}`,
            user: '谱师',
          });
        } catch (error) {
          setResults(prev => ({
            ...prev,
            failed: prev.failed + 1,
            messages: [...prev.messages, `✗ ${chartData.name}: 操作失败`],
          }));
        }
      }
    }

    setIsProcessing(false);
    setShowResults(true);
    setCurrentTask('');
  };

  const totalNotes = selectedCharts.reduce((sum, id) => {
    const c = charts.find(chart => chart.id === id);
    return sum + (c?.notes.length || 0);
  }, 0);

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">批处理</h1>
          <p className="text-gray-400 font-mono text-sm">批量处理多个谱面，提高工作效率</p>
        </div>
        <button
          onClick={executeBatch}
          disabled={isProcessing || selectedCharts.length === 0 || tasks.filter(t => t.enabled).length === 0}
          className="btn-neon-primary flex items-center gap-2"
        >
          {isProcessing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Layers className="w-4 h-4" />
          )}
          {isProcessing ? '处理中...' : '开始批处理'}
        </button>
      </motion.div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="选中谱面"
          value={`${selectedCharts.length}/${projectCharts.length}`}
          icon={FolderOpen}
          color="cyan"
          delay={0.1}
        />
        <StatCard
          title="总音符数"
          value={totalNotes.toLocaleString()}
          icon={Music}
          color="pink"
          delay={0.2}
        />
        <StatCard
          title="启用任务"
          value={tasks.filter(t => t.enabled).length}
          icon={Settings}
          color="green"
          delay={0.3}
        />
        <StatCard
          title="歌曲数"
          value={projectSongs.length}
          icon={Music}
          color="yellow"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-neon-cyan" />
              选择谱面
            </h3>
            <button
              onClick={handleSelectAll}
              className="text-xs text-neon-cyan font-mono hover:underline"
            >
              {selectedCharts.length === projectCharts.length ? '取消全选' : '全选'}
            </button>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-neon pr-2">
            {projectCharts.map((c) => {
              const songData = songs.find(s => s.id === c.songId);
              return (
                <div
                  key={c.id}
                  onClick={() => handleChartSelect(c.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedCharts.includes(c.id)
                      ? 'bg-neon-cyan/10 border-neon-cyan/50'
                      : 'bg-bg-dark/50 border-border hover:border-neon-cyan/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                      selectedCharts.includes(c.id)
                        ? 'bg-neon-cyan border-neon-cyan'
                        : 'border-gray-600'
                    }`}>
                      {selectedCharts.includes(c.id) && (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-mono text-sm truncate">{c.name}</p>
                      <p className="text-xs text-gray-500 font-mono truncate">
                        {songData?.title || '未知歌曲'} · Lv.{c.difficulty}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-6"
        >
          <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-neon-pink" />
            批处理任务
          </h3>
          
          <div className="space-y-4">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className={`p-4 rounded-lg border transition-all ${
                  task.enabled
                    ? 'bg-neon-cyan/5 border-neon-cyan/30'
                    : 'bg-bg-dark/30 border-border'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      task.enabled
                        ? 'bg-neon-cyan border-neon-cyan'
                        : 'border-gray-600 hover:border-neon-cyan/50'
                    }`}
                  >
                    {task.enabled && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </button>
                  <task.icon className={`w-5 h-5 ${task.enabled ? 'text-neon-cyan' : 'text-gray-500'}`} />
                  <div>
                    <p className={`font-mono text-sm ${task.enabled ? 'text-white' : 'text-gray-400'}`}>
                      {task.name}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">{task.description}</p>
                  </div>
                </div>

                {task.enabled && (
                  <div className="ml-8 space-y-3">
                    {task.id === 'offset' && (
                      <div>
                        <label className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400 font-mono">偏移量 (ms)</span>
                          <span className="text-neon-cyan font-mono">{task.config.offset}</span>
                        </label>
                        <input
                          type="range"
                          min="-500"
                          max="500"
                          step="10"
                          value={task.config.offset}
                          onChange={(e) => updateTaskConfig(task.id, 'offset', parseInt(e.target.value))}
                          className="w-full accent-neon-cyan"
                        />
                      </div>
                    )}

                    {task.id === 'sound' && (
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">原音效</label>
                          <select
                            value={task.config.oldSound}
                            onChange={(e) => updateTaskConfig(task.id, 'oldSound', e.target.value)}
                            className="w-full bg-bg-dark/50 border border-border rounded px-2 py-1 text-sm text-white font-mono"
                          >
                            <option value="">全部音效</option>
                            <option value="normal">普通</option>
                            <option value="snare">军鼓</option>
                            <option value="kick">底鼓</option>
                            <option value="hihat">踩镲</option>
                            <option value="clap">拍手</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">新音效</label>
                          <select
                            value={task.config.newSound}
                            onChange={(e) => updateTaskConfig(task.id, 'newSound', e.target.value)}
                            className="w-full bg-bg-dark/50 border border-border rounded px-2 py-1 text-sm text-white font-mono"
                          >
                            <option value="normal">普通</option>
                            <option value="snare">军鼓</option>
                            <option value="kick">底鼓</option>
                            <option value="hihat">踩镲</option>
                            <option value="clap">拍手</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {task.id === 'rename' && (
                      <div>
                        <label className="text-xs text-gray-400 font-mono block mb-1">命名模式</label>
                        <input
                          type="text"
                          value={task.config.pattern}
                          onChange={(e) => updateTaskConfig(task.id, 'pattern', e.target.value)}
                          className="w-full bg-bg-dark/50 border border-border rounded px-2 py-1 text-sm text-white font-mono focus:outline-none focus:border-neon-cyan"
                          placeholder="{artist}_{title}_{difficulty}"
                        />
                        <p className="text-xs text-gray-600 font-mono mt-1">
                          可用变量: {'{artist}'}, {'{title}'}, {'{difficulty}'}
                        </p>
                      </div>
                    )}

                    {task.id === 'export' && (
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">导出格式</label>
                          <select
                            value={task.config.format}
                            onChange={(e) => updateTaskConfig(task.id, 'format', e.target.value)}
                            className="w-full bg-bg-dark/50 border border-border rounded px-2 py-1 text-sm text-white font-mono"
                          >
                            <option value="json">JSON</option>
                            <option value="osu">OSU</option>
                            <option value="bms">BMS</option>
                          </select>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={task.config.includeAssets}
                            onChange={(e) => updateTaskConfig(task.id, 'includeAssets', e.target.checked)}
                            className="w-4 h-4 accent-neon-cyan"
                          />
                          <span className="text-xs text-gray-400 font-mono">包含资源文件</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-6"
        >
          <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileArchive className="w-5 h-5 text-neon-green" />
            处理进度
          </h3>

          {isProcessing && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white font-mono">{currentTask}</span>
                <span className="text-sm text-neon-cyan font-mono">{Math.round(processProgress)}%</span>
              </div>
              <ProgressBar
                value={processProgress}
                label=""
                showLabel={false}
                color="cyan"
                height={12}
              />
            </div>
          )}

          {showResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-neon-green/10 border border-neon-green/30 text-center">
                  <CheckCircle2 className="w-8 h-8 text-neon-green mx-auto mb-2" />
                  <p className="text-2xl font-display font-bold text-neon-green">{results.success}</p>
                  <p className="text-xs text-gray-400 font-mono">成功</p>
                </div>
                <div className="p-4 rounded-lg bg-neon-red/10 border border-neon-red/30 text-center">
                  <AlertCircle className="w-8 h-8 text-neon-red mx-auto mb-2" />
                  <p className="text-2xl font-display font-bold text-neon-red">{results.failed}</p>
                  <p className="text-xs text-gray-400 font-mono">失败</p>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto scrollbar-neon space-y-1">
                {results.messages.map((msg, i) => (
                  <p
                    key={i}
                    className={`text-xs font-mono ${
                      msg.startsWith('✓') ? 'text-neon-green' : 'text-neon-red'
                    }`}
                  >
                    {msg}
                  </p>
                ))}
              </div>
            </div>
          )}

          {!isProcessing && !showResults && (
            <div className="text-center py-12">
              <Layers className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 font-mono">选择谱面和任务</p>
              <p className="text-xs text-gray-600 font-mono mt-1">然后点击开始批处理</p>
            </div>
          )}

          {selectedCharts.length > 0 && tasks.filter(t => t.enabled).length > 0 && !isProcessing && (
            <div className="mt-6 p-4 rounded-lg bg-bg-dark/50 border border-border">
              <p className="text-sm text-gray-400 font-mono mb-2">即将执行:</p>
              <ul className="space-y-1">
                {tasks.filter(t => t.enabled).map(task => (
                  <li key={task.id} className="text-xs text-white font-mono flex items-center gap-2">
                    <ChevronRight className="w-3 h-3 text-neon-cyan" />
                    {task.name}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 font-mono mt-3">
                将处理 {selectedCharts.length} 个谱面，共 {totalNotes} 个音符
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
