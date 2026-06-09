import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useProjectStore } from '../store/useProjectStore';
import { useEditorStore } from '../store/useEditorStore';
import { useAudioStore } from '../store/useAudioStore';
import { StatCard } from '../components/ui/StatCard';
import { Waveform } from '../components/ui/Waveform';
import { ProgressBar } from '../components/ui/ProgressBar';
import {
  Activity,
  Zap,
  Target,
  Grid3X3,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Sliders,
  Flame,
  Layers,
  Clock,
} from 'lucide-react';
import { generateBeatGrid, snapAllNotesToGrid, calculateHeatMap, estimateDifficulty } from '../utils/beat/beatGrid';
import { formatTime, formatBPM, getDifficultyColor } from '../utils/formatters';
import type { HeatMapZone, BeatGrid } from '../types';

export function BeatAnalysis() {
  const { getCurrentSong, getCurrentChart, updateChart, addEditHistory } = useProjectStore();
  const { beatGrid, setBeatGrid, snapDivision, setSnapDivision } = useEditorStore();
  const { waveformData, currentTime, duration, isPlaying, togglePlay, seekTo } = useAudioStore();
  
  const [bpm, setBpm] = useState(120);
  const [offset, setOffset] = useState(0);
  const [heatMap, setHeatMap] = useState<HeatMapZone[]>([]);
  const [estimatedDifficulty, setEstimatedDifficulty] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showMeasureLines, setShowMeasureLines] = useState(true);
  const [showBeatLines, setShowBeatLines] = useState(true);

  const song = getCurrentSong();
  const chart = getCurrentChart();

  useEffect(() => {
    if (song) {
      setBpm(song.bpm);
      setOffset(song.offset);
    }
  }, [song]);

  useEffect(() => {
    if (bpm && duration) {
      const grid = generateBeatGrid(bpm, offset, duration);
      setBeatGrid(grid);
    }
  }, [bpm, offset, duration, setBeatGrid]);

  useEffect(() => {
    if (chart && duration) {
      const zones = calculateHeatMap(chart.notes, duration);
      setHeatMap(zones);
      const diff = estimateDifficulty(chart);
      setEstimatedDifficulty(diff);
    }
  }, [chart, duration]);

  const handleAnalyze = async () => {
    if (!chart || !beatGrid) return;
    
    setIsAnalyzing(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const snappedNotes = snapAllNotesToGrid(chart.notes, beatGrid, snapDivision);
    const newHeatMap = calculateHeatMap(snappedNotes, duration || 0);
    const newDifficulty = estimateDifficulty({ ...chart, notes: snappedNotes });
    
    updateChart(chart.id, { notes: snappedNotes });
    setHeatMap(newHeatMap);
    setEstimatedDifficulty(newDifficulty);
    
    addEditHistory({
      projectId: chart.projectId,
      chartId: chart.id,
      action: 'align_notes',
      type: 'edit',
      description: `批量对齐 ${snappedNotes.length} 个音符到 ${snapDivision} 分音符网格`,
      user: '谱师',
    });
    
    setIsAnalyzing(false);
  };

  const handleSnapDivisionChange = (division: number) => {
    setSnapDivision(division);
  };

  const handleWaveformClick = (time: number) => {
    seekTo(time);
  };

  const measureCount = beatGrid?.measures.length || 0;
  const beatCount = beatGrid?.beats.length || 0;
  const totalNotes = chart?.notes.length || 0;

  const densityData = heatMap.map((zone, i) => ({
    time: `${Math.floor(zone.startTime)}s`,
    density: zone.density,
    intensity: zone.intensity,
  }));

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">节拍分析</h1>
          <p className="text-gray-400 font-mono text-sm">分析BPM、生成节拍网格、标记小节线</p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="btn-neon-primary flex items-center gap-2"
        >
          {isAnalyzing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          {isAnalyzing ? '分析中...' : '重新分析'}
        </button>
      </motion.div>

      <div className="grid grid-cols-5 gap-4">
        <StatCard
          title="BPM"
          value={bpm.toFixed(1)}
          icon={Activity}
          color="cyan"
          delay={0.1}
        />
        <StatCard
          title="小节数"
          value={measureCount}
          icon={Grid3X3}
          color="pink"
          delay={0.2}
        />
        <StatCard
          title="拍数"
          value={beatCount}
          icon={Target}
          color="green"
          delay={0.3}
        />
        <StatCard
          title="热区数"
          value={heatMap.filter(z => z.intensity === 'high' || z.intensity === 'extreme').length}
          icon={Flame}
          color="yellow"
          delay={0.4}
        />
        <StatCard
          title="预估难度"
          value={`Lv.${estimatedDifficulty}`}
          icon={Sliders}
          color="red"
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
            <Settings className="w-5 h-5 text-neon-cyan" />
            节拍参数
          </h3>
          <div className="space-y-6">
            <div>
              <label className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400 font-mono">BPM</span>
                <span className="text-neon-cyan font-mono font-bold">{bpm.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="60"
                max="300"
                step="0.5"
                value={bpm}
                onChange={(e) => setBpm(parseFloat(e.target.value))}
                className="w-full h-2 bg-bg-dark rounded-full appearance-none cursor-pointer accent-neon-cyan"
              />
            </div>

            <div>
              <label className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400 font-mono">偏移量 (ms)</span>
                <span className="text-neon-pink font-mono font-bold">{offset}</span>
              </label>
              <input
                type="range"
                min="-500"
                max="500"
                step="1"
                value={offset}
                onChange={(e) => setOffset(parseInt(e.target.value))}
                className="w-full h-2 bg-bg-dark rounded-full appearance-none cursor-pointer accent-neon-pink"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 font-mono mb-2 block">吸附精度</label>
              <div className="grid grid-cols-4 gap-2">
                {[4, 8, 16, 32].map((div) => (
                  <button
                    key={div}
                    onClick={() => handleSnapDivisionChange(div)}
                    className={`p-2 rounded-lg font-mono text-sm transition-all ${
                      snapDivision === div
                        ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50'
                        : 'bg-bg-dark/50 text-gray-400 border border-border hover:border-neon-cyan/30'
                    }`}
                  >
                    1/{div}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-400 font-mono">显示小节线</span>
                <input
                  type="checkbox"
                  checked={showMeasureLines}
                  onChange={(e) => setShowMeasureLines(e.target.checked)}
                  className="w-4 h-4 accent-neon-cyan"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-400 font-mono">显示节拍线</span>
                <input
                  type="checkbox"
                  checked={showBeatLines}
                  onChange={(e) => setShowBeatLines(e.target.checked)}
                  className="w-4 h-4 accent-neon-pink"
                />
              </label>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="col-span-2 glass-card p-6"
        >
          <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-neon-pink" />
            节拍网格
          </h3>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-cyan to-neon-pink flex items-center justify-center shadow-neon-cyan"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-white" />
                ) : (
                  <Play className="w-4 h-4 text-white ml-0.5" />
                )}
              </button>
              <div>
                <p className="text-white font-mono text-sm">{formatTime(currentTime)}</p>
                <p className="text-xs text-gray-500 font-mono">/ {formatTime(duration || 0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm font-mono">
              <span className="text-gray-400">
                小节: <span className="text-neon-cyan">{Math.floor(currentTime / (60 / bpm) / 4) + 1}</span>
              </span>
              <span className="text-gray-400">
                拍: <span className="text-neon-pink">{Math.floor((currentTime / (60 / bpm)) % 4) + 1}</span>
              </span>
            </div>
          </div>

          <div className="relative">
            <Waveform
              data={waveformData.length > 0 ? waveformData : Array(200).fill(0).map(() => Math.random() * 0.5 + 0.2)}
              color="#00f0ff"
              height={200}
              showCursor
              cursorPosition={currentTime / (duration || 1)}
              onClick={handleWaveformClick}
            />
            
            {showBeatLines && beatGrid && (
              <div className="absolute inset-0 pointer-events-none">
                {beatGrid.beats.map((beat, i) => (
                  <div
                    key={`beat-${i}`}
                    className="absolute top-0 bottom-0 w-px bg-neon-pink/30"
                    style={{ left: `${(beat.time / (duration || 1)) * 100}%` }}
                  />
                ))}
              </div>
            )}
            
            {showMeasureLines && beatGrid && (
              <div className="absolute inset-0 pointer-events-none">
                {beatGrid.measures.map((measure, i) => (
                  <div key={`measure-${i}`} className="absolute top-0 bottom-0" style={{ left: `${(measure.time / (duration || 1)) * 100}%` }}>
                    <div className="w-0.5 h-full bg-neon-cyan/60" />
                    <div className="absolute -bottom-1 left-1 text-xs text-neon-cyan font-mono">
                      {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-neon-cyan/60" />
              <span className="text-gray-400">小节线</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-px h-4 bg-neon-pink/60" />
              <span className="text-gray-400">节拍线</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-neon-pink" />
              <span className="text-gray-400">播放位置</span>
            </div>
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
            <Flame className="w-5 h-5 text-neon-yellow" />
            节奏热区
          </h3>
          <div className="space-y-3">
            {heatMap.slice(0, 8).map((zone, i) => (
              <div key={i} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400 font-mono">
                    {formatTime(zone.startTime)} - {formatTime(zone.endTime)}
                  </span>
                  <span className="text-xs font-mono" style={{ 
                    color: zone.intensity === 'extreme' ? '#ff3366' : zone.intensity === 'high' ? '#ffcc00' : '#00ff88'
                  }}>
                    密度: {zone.density.toFixed(1)} NPS
                  </span>
                </div>
                <div className="h-6 bg-bg-dark/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, zone.density * 8)}%`,
                      background: `linear-gradient(to right, #00ff88, #ffcc00, #ff3366)`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="glass-card p-6"
        >
          <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-neon-green" />
            分析结果
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-bg-dark/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400 font-mono">音符总数</span>
                <span className="text-neon-cyan font-mono font-bold">{totalNotes}</span>
              </div>
              <ProgressBar
                value={totalNotes}
                max={2000}
                label=""
                showLabel={false}
                color="cyan"
              />
            </div>

            <div className="p-4 rounded-lg bg-bg-dark/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400 font-mono">平均NPS</span>
                <span className="text-neon-pink font-mono font-bold">
                  {(totalNotes / Math.max(duration || 1, 1)).toFixed(2)}
                </span>
              </div>
              <ProgressBar
                value={(totalNotes / Math.max(duration || 1, 1))}
                max={20}
                label=""
                showLabel={false}
                color="pink"
              />
            </div>

            <div className="p-4 rounded-lg bg-bg-dark/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400 font-mono">预估难度</span>
                <span className="font-mono font-bold" style={{ color: getDifficultyColor(estimatedDifficulty) }}>
                  Lv.{estimatedDifficulty}
                </span>
              </div>
              <ProgressBar
                value={estimatedDifficulty}
                max={30}
                label=""
                showLabel={false}
                color="yellow"
              />
            </div>

            <div className="grid grid-cols-4 gap-2 mt-4">
              {['tap', 'hold', 'slide', 'swing'].map((type) => {
                const count = chart?.notes.filter(n => n.type === type).length || 0;
                return (
                  <div key={type} className="text-center p-2 rounded-lg bg-bg-dark/50 border border-border">
                    <div className={`text-lg font-bold font-mono ${
                      type === 'tap' ? 'text-neon-cyan' :
                      type === 'hold' ? 'text-neon-green' :
                      type === 'slide' ? 'text-neon-pink' : 'text-neon-yellow'
                    }`}>
                      {count}
                    </div>
                    <div className="text-xs text-gray-500 font-mono uppercase">{type}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {isAnalyzing && (
        <div className="fixed inset-0 bg-bg-dark/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-8 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 border-4 border-neon-cyan border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-white font-mono text-lg">正在分析节拍...</p>
            <p className="text-gray-400 font-mono text-sm mt-2">对齐音符到节拍网格</p>
          </div>
        </div>
      )}
    </div>
  );
}
