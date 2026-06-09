import { motion } from 'framer-motion';
import { useProjectStore } from '../store/useProjectStore';
import { useValidationStore } from '../store/useValidationStore';
import { StatCard } from '../components/ui/StatCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { DifficultyRadar } from '../components/charts/DifficultyRadar';
import { DensityChart } from '../components/charts/DensityChart';
import {
  Music,
  Clock,
  FileWarning,
  CheckCircle2,
  TrendingUp,
  Target,
  Zap,
  AlertCircle,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { formatTime, getDifficultyColor } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { getCurrentProject, getCurrentSong, getCurrentChart, getEditHistory } = useProjectStore();
  const { getLatestReport } = useValidationStore();
  const navigate = useNavigate();

  const project = getCurrentProject();
  const song = getCurrentSong();
  const chart = getCurrentChart();
  const report = chart ? getLatestReport(chart.id) : undefined;
  const history = project ? getEditHistory(project.id) : [];

  const totalNotes = chart?.notes.length || 0;
  const totalDuration = song?.duration || 0;
  const avgNPS = report?.averageNPS || 0;
  const issuesCount = report?.totalIssues || 0;

  const recentHistory = history.slice(0, 5);

  const radarData = [
    { subject: '密度', value: avgNPS * 1.5, fullMark: 20 },
    { subject: '节奏', value: (chart?.notes.filter(n => n.type === 'swing').length || 0) / Math.max(totalNotes, 1) * 15, fullMark: 20 },
    { subject: '复杂度', value: (chart?.notes.filter(n => n.type === 'hold' || n.type === 'slide').length || 0) / Math.max(totalNotes, 1) * 15, fullMark: 20 },
    { subject: '速度', value: (song?.bpm || 0) / 30, fullMark: 20 },
    { subject: '精准度', value: Math.max(0, 20 - issuesCount), fullMark: 20 },
    { subject: '多样性', value: new Set(chart?.notes.map(n => n.type)).size * 5, fullMark: 20 },
  ];

  const densityData = Array.from({ length: 20 }, (_, i) => ({
    time: `${i * 10}s`,
    density: Math.floor(Math.random() * 8) + 4 + (i > 8 && i < 14 ? 6 : 0),
  }));

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">
            欢迎回来，谱师
          </h1>
          <p className="text-gray-400 font-mono text-sm">
            当前项目: {project?.name || '未选择'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 font-mono">
          <Calendar className="w-4 h-4" />
          {new Date().toLocaleDateString('zh-CN')}
        </div>
      </motion.div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="总音符数"
          value={totalNotes.toLocaleString()}
          icon={Music}
          color="cyan"
          delay={0.1}
        />
        <StatCard
          title="歌曲时长"
          value={formatTime(totalDuration)}
          icon={Clock}
          color="pink"
          delay={0.2}
        />
        <StatCard
          title="待修复问题"
          value={issuesCount}
          icon={FileWarning}
          color={issuesCount > 0 ? 'red' : 'green'}
          delay={0.3}
        />
        <StatCard
          title="预估难度"
          value={`Lv.${report?.estimatedDifficulty || chart?.difficultyLevel || 0}`}
          icon={Target}
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
          <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-neon-cyan" />
            歌曲信息
          </h3>
          {song ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-mono text-sm">歌曲名</span>
                <span className="text-white font-mono">{song.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-mono text-sm">艺术家</span>
                <span className="text-white font-mono">{song.artist}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-mono text-sm">BPM</span>
                <span className="text-neon-cyan font-mono font-bold">{song.bpm}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-mono text-sm">偏移</span>
                <span className="text-white font-mono">{song.offset}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-mono text-sm">难度等级</span>
                <span className="font-mono font-bold" style={{ color: getDifficultyColor(chart?.difficultyLevel || 0) }}>
                  Lv.{chart?.difficultyLevel || 0}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8 font-mono">请先选择歌曲</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-6"
        >
          <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-neon-pink" />
            难度分析
          </h3>
          {chart ? (
            <DifficultyRadar data={radarData} color="#ff00aa" />
          ) : (
            <p className="text-gray-500 text-center py-8 font-mono">请先选择谱面</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-6"
        >
          <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-neon-yellow" />
            快速操作
          </h3>
          <div className="space-y-3">
            {[
              { label: '音频导入', path: '/audio-import', icon: Music, desc: '导入新的音频文件' },
              { label: '节拍分析', path: '/beat-analysis', icon: Zap, desc: '分析BPM和节拍' },
              { label: '轨道编辑', path: '/track-editor', icon: Target, desc: '编辑音符和轨道' },
              { label: '规则校验', path: '/validation', icon: CheckCircle2, desc: '检查谱面问题' },
              { label: '试玩预览', path: '/preview', icon: TrendingUp, desc: '实时预览谱面' },
            ].map((item, index) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-bg-dark/50 hover:bg-neon-cyan/10 border border-border hover:border-neon-cyan/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-neon-cyan" />
                  <div className="text-left">
                    <div className="text-sm text-white font-mono">{item.label}</div>
                    <div className="text-xs text-gray-500 font-mono">{item.desc}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-neon-cyan transition-colors" />
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-card p-6"
        >
          <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-neon-green" />
            音符密度分布
          </h3>
          <DensityChart data={densityData} threshold={12} color="#00ff88" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="glass-card p-6"
        >
          <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-neon-purple" />
            编辑进度
          </h3>
          <div className="space-y-4">
            <ProgressBar
              value={report ? (totalNotes - issuesCount) / Math.max(totalNotes, 1) * 100 : 0}
              label="谱面完成度"
              color="green"
            />
            <ProgressBar
              value={report ? ((report?.issues?.filter(i => i.isFixed).length || 0) / Math.max(issuesCount, 1)) * 100 : 0}
              label="问题修复率"
              color="cyan"
            />
            <ProgressBar
              value={avgNPS}
              max={20}
              label="平均NPS"
              color="pink"
            />
            <ProgressBar
              value={song?.bpm || 0}
              max={300}
              label="BPM"
              color="yellow"
            />
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="glass-card p-6"
      >
        <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-neon-cyan" />
          最近修改记录
        </h3>
        {recentHistory.length > 0 ? (
          <div className="space-y-3">
            {recentHistory.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 rounded-lg bg-bg-dark/30 border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    record.type === 'add' ? 'bg-neon-green/20 text-neon-green' :
                    record.type === 'delete' ? 'bg-neon-red/20 text-neon-red' :
                    'bg-neon-yellow/20 text-neon-yellow'
                  }`}>
                    {record.type === 'add' ? '+' : record.type === 'delete' ? '-' : '✏'}
                  </div>
                  <div>
                    <p className="text-sm text-white font-mono">{record.description}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {new Date(record.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 font-mono">{record.user}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8 font-mono">暂无修改记录</p>
        )}
      </motion.div>
    </div>
  );
}
