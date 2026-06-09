import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useProjectStore } from '../store/useProjectStore';
import { useEditorStore } from '../store/useEditorStore';
import { useAudioStore } from '../store/useAudioStore';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Settings,
  Zap,
  Music,
  Target,
  Clock,
  Eye,
  EyeOff,
  RotateCcw,
  Gauge,
} from 'lucide-react';
import { formatTime, getDifficultyColor } from '../utils/formatters';
import type { Note } from '../types';

type JudgeResult = 'perfect' | 'great' | 'good' | 'miss';

interface HitNote {
  noteId: string;
  result: JudgeResult;
  time: number;
}

const judgeColors: Record<JudgeResult, string> = {
  perfect: '#00f0ff',
  great: '#00ff88',
  good: '#ffcc00',
  miss: '#ff3366',
};

const judgeLabels: Record<JudgeResult, string> = {
  perfect: 'PERFECT',
  great: 'GREAT',
  good: 'GOOD',
  miss: 'MISS',
};

const trackColors = [
  'from-neon-cyan/30 to-neon-cyan/10',
  'from-neon-pink/30 to-neon-pink/10',
  'from-neon-green/30 to-neon-green/10',
  'from-neon-yellow/30 to-neon-yellow/10',
  'from-neon-purple/30 to-neon-purple/10',
  'from-neon-red/30 to-neon-red/10',
];

export function Preview() {
  const { getCurrentSong, getCurrentChart } = useProjectStore();
  const { currentTime, setCurrentTime, isPlaying, setIsPlaying } = useEditorStore();
  const { duration } = useAudioStore();
  
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showJudgement, setShowJudgement] = useState(true);
  const [showCombo, setShowCombo] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [hitNotes, setHitNotes] = useState<HitNote[]>([]);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [judgeCounts, setJudgeCounts] = useState<Record<JudgeResult, number>>({
    perfect: 0, great: 0, good: 0, miss: 0,
  });
  const [lastJudge, setLastJudge] = useState<{ result: JudgeResult; time: number } | null>(null);
  
  const playAreaRef = useRef<HTMLDivElement>(null);
  const playIntervalRef = useRef<number | null>(null);
  const processedNotesRef = useRef<Set<string>>(new Set());

  const song = getCurrentSong();
  const chart = getCurrentChart();

  const pixelPerSecond = 400;
  const judgeLinePosition = 0.85;

  const judgeNote = useCallback((note: Note, hitTime: number): JudgeResult => {
    const diff = Math.abs(hitTime - note.time);
    if (diff < 0.05) return 'perfect';
    if (diff < 0.1) return 'great';
    if (diff < 0.15) return 'good';
    return 'miss';
  }, []);

  const currentTimeRef = useRef(0);
  
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    if (isPlaying && autoPlay && chart) {
      playIntervalRef.current = window.setInterval(() => {
        const prev = currentTimeRef.current;
        const newTime = prev + 0.016 * playbackSpeed;
        currentTimeRef.current = newTime;
        
        chart.notes.forEach(note => {
          if (!processedNotesRef.current.has(note.id) && 
              Math.abs(newTime - note.time) < 0.03) {
            const result = 'perfect' as const;
            processedNotesRef.current.add(note.id);
            
            setHitNotes(prev => [...prev, { noteId: note.id, result, time: newTime }]);
            setJudgeCounts(prev => ({ ...prev, [result]: prev[result] + 1 }));
            setCombo(prev => {
              const newCombo = prev + 1;
              setMaxCombo(max => Math.max(max, newCombo));
              return newCombo;
            });
            setLastJudge({ result, time: newTime });
          }
          
          if (!processedNotesRef.current.has(note.id) && newTime > note.time + 0.15) {
            processedNotesRef.current.add(note.id);
            setHitNotes(prev => [...prev, { noteId: note.id, result: 'miss', time: newTime }]);
            setJudgeCounts(prev => ({ ...prev, miss: prev.miss + 1 }));
            setCombo(0);
            setLastJudge({ result: 'miss', time: newTime });
          }
        });
        
        if (newTime >= (duration || 0)) {
          setIsPlaying(false);
          setCurrentTime(0);
          currentTimeRef.current = 0;
        } else {
          setCurrentTime(newTime);
        }
      }, 16);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    }
    
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, autoPlay, chart, duration, playbackSpeed, setCurrentTime, setIsPlaying]);

  const handleTogglePlay = () => {
    if (currentTime >= (duration || 0)) {
      handleRestart();
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentTime(0);
    setHitNotes([]);
    setCombo(0);
    setMaxCombo(0);
    setJudgeCounts({ perfect: 0, great: 0, good: 0, miss: 0 });
    setLastJudge(null);
    processedNotesRef.current.clear();
    setIsPlaying(true);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault();
      handleTogglePlay();
    } else if (e.key === 'r' || e.key === 'R') {
      handleRestart();
    }
  }, [isPlaying]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const visibleNotes = chart?.notes.filter(note => {
    const noteY = (note.time - currentTime) * pixelPerSecond;
    return noteY > -200 && noteY < playAreaRef.current?.clientHeight! + 200;
  }) || [];

  const totalNotes = chart?.notes.length || 0;
  const hitCount = hitNotes.length;
  const accuracy = hitCount > 0 
    ? ((judgeCounts.perfect * 100 + judgeCounts.great * 75 + judgeCounts.good * 50) / (hitCount * 100) * 100).toFixed(2)
    : '0.00';

  const score = judgeCounts.perfect * 300 + judgeCounts.great * 200 + judgeCounts.good * 100;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg-dark">
      <div className="p-4 border-b border-border bg-bg-dark/80 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="font-display text-2xl font-bold text-white">试玩预览</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSeek(Math.max(0, currentTime - 5))}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={handleTogglePlay}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-cyan to-neon-pink flex items-center justify-center shadow-neon-cyan hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </button>
            <button
              onClick={() => handleSeek(Math.min(duration || 0, currentTime + 5))}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              onClick={handleRestart}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
              title="重新开始 (R)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          <div>
            <p className="text-white font-mono">{formatTime(currentTime)}</p>
            <p className="text-xs text-gray-500 font-mono">/ {formatTime(duration || 0)}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-neon-cyan" />
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="bg-bg-dark/50 border border-border rounded-lg px-2 py-1 text-sm text-white font-mono focus:outline-none focus:border-neon-cyan"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="w-24 accent-neon-cyan"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPlay}
                onChange={(e) => setAutoPlay(e.target.checked)}
                className="w-4 h-4 accent-neon-green"
              />
              <span className="text-xs text-gray-400 font-mono">自动演示</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowJudgement(!showJudgement)}
              className={`p-2 rounded-lg ${showJudgement ? 'bg-neon-cyan/10 text-neon-cyan' : 'bg-bg-dark/50 text-gray-400'}`}
            >
              {showJudgement ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowCombo(!showCombo)}
              className={`p-2 rounded-lg ${showCombo ? 'bg-neon-pink/10 text-neon-pink' : 'bg-bg-dark/50 text-gray-400'}`}
            >
              <Zap className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-48 p-4 border-r border-border bg-bg-dark/60 space-y-4">
          <div className="text-center p-4 rounded-lg bg-bg-dark/50 border border-border">
            <p className="text-xs text-gray-500 font-mono mb-1">歌曲</p>
            <p className="text-white font-mono text-sm truncate">{song?.title || '--'}</p>
            <p className="text-xs text-gray-500 font-mono truncate">{song?.artist || '--'}</p>
          </div>

          <div className="text-center p-4 rounded-lg bg-bg-dark/50 border border-border">
            <p className="text-xs text-gray-500 font-mono mb-1">难度</p>
            <p className="font-display font-bold text-2xl" style={{ color: getDifficultyColor(chart?.difficultyLevel || 0) }}>
              Lv.{chart?.difficultyLevel || 0}
            </p>
          </div>

          <div className="text-center p-4 rounded-lg bg-bg-dark/50 border border-border">
            <p className="text-xs text-gray-500 font-mono mb-1">得分</p>
            <p className="font-display font-bold text-2xl text-neon-cyan">{score.toLocaleString()}</p>
          </div>

          <div className="text-center p-4 rounded-lg bg-bg-dark/50 border border-border">
            <p className="text-xs text-gray-500 font-mono mb-1">精度</p>
            <p className="font-display font-bold text-2xl text-neon-green">{accuracy}%</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-mono">判定统计</p>
            {(['perfect', 'great', 'good', 'miss'] as JudgeResult[]).map((result) => (
              <div key={result} className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-dark/30">
                <span className="text-xs font-mono" style={{ color: judgeColors[result] }}>
                  {judgeLabels[result]}
                </span>
                <span className="text-white font-mono font-bold">{judgeCounts[result]}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-mono">进度</p>
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-dark/30">
              <span className="text-xs text-gray-400 font-mono">音符</span>
              <span className="text-white font-mono">{hitCount}/{totalNotes}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-dark/30">
              <span className="text-xs text-gray-400 font-mono">最大连击</span>
              <span className="text-neon-yellow font-mono font-bold">{maxCombo}</span>
            </div>
          </div>
        </div>

        <div ref={playAreaRef} className="flex-1 relative overflow-hidden bg-gradient-to-b from-bg-dark via-bg-dark/90 to-bg-dark">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }} />
          </div>

          {showCombo && combo > 0 && (
            <motion.div
              key={combo}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center z-20 pointer-events-none"
            >
              <p className="font-display text-6xl font-bold text-neon-yellow" style={{ textShadow: '0 0 30px rgba(255, 204, 0, 0.8)' }}>
                {combo}
              </p>
              <p className="text-sm font-mono text-neon-yellow tracking-widest">COMBO</p>
            </motion.div>
          )}

          {showJudgement && lastJudge && Date.now() - lastJudge.time * 1000 < 500 && (
            <motion.div
              key={`${lastJudge.result}-${lastJudge.time}`}
              initial={{ y: 0, opacity: 1, scale: 1.2 }}
              animate={{ y: -50, opacity: 0, scale: 0.8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
            >
              <p 
                className="font-display text-4xl font-bold tracking-widest"
                style={{ 
                  color: judgeColors[lastJudge.result],
                  textShadow: `0 0 20px ${judgeColors[lastJudge.result]}`,
                }}
              >
                {judgeLabels[lastJudge.result]}
              </p>
            </motion.div>
          )}

          <div 
            className="absolute w-full z-10"
            style={{ top: `${judgeLinePosition * 100}%` }}
          >
            <div className="h-1 bg-gradient-to-r from-transparent via-neon-pink to-transparent" style={{ boxShadow: '0 0 20px rgba(255, 0, 170, 0.8)' }} />
            <div className="absolute left-0 right-0 flex justify-center -mt-1">
              <div className="w-32 h-16 border-2 border-neon-pink/50 rounded-t-full" style={{ boxShadow: '0 0 30px rgba(255, 0, 170, 0.3)' }} />
            </div>
          </div>

          <div className="absolute inset-0 flex px-12">
            {[0, 1, 2, 3, 4, 5].map((trackIndex) => (
              <div
                key={trackIndex}
                className={`flex-1 relative bg-gradient-to-b ${trackColors[trackIndex]} border-x border-white/5`}
              >
                {visibleNotes
                  .filter(note => note.trackIndex === trackIndex)
                  .map((note) => {
                    const noteY = (note.time - currentTime) * pixelPerSecond;
                    const topPercent = judgeLinePosition * 100 + noteY / playAreaRef.current!.clientHeight * 100;
                    
                    if (topPercent < -20 || topPercent > 120) return null;

                    const isHit = hitNotes.some(h => h.noteId === note.id);
                    const hitResult = hitNotes.find(h => h.noteId === note.id)?.result;

                    return (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0 }}
                        animate={{ 
                          opacity: isHit ? 0.3 : 1,
                          scale: isHit ? 1.5 : 1,
                        }}
                        className={`absolute left-2 right-2 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                          note.type === 'tap' ? 'note-tap' :
                          note.type === 'hold' ? 'note-hold' :
                          note.type === 'slide' ? 'note-slide' : 'note-swing'
                        } ${isHit ? 'opacity-30' : ''}`}
                        style={{ 
                          top: `${topPercent}%`,
                          transform: 'translateY(-50%)',
                          boxShadow: isHit && hitResult ? `0 0 20px ${judgeColors[hitResult]}` : undefined,
                        }}
                      >
                        {note.type === 'tap' ? 'T' : note.type === 'hold' ? 'H' : note.type === 'slide' ? 'S' : 'W'}
                      </motion.div>
                    );
                  })}
              </div>
            ))}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg-dark to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-bg-dark to-transparent pointer-events-none" />
        </div>
      </div>

      <div className="h-2 bg-bg-dark border-t border-border">
        <div 
          className="h-full bg-gradient-to-r from-neon-cyan to-neon-pink transition-all duration-75"
          style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
        />
      </div>

      <div className="p-2 border-t border-border bg-bg-dark/80 flex items-center justify-between text-xs text-gray-500 font-mono">
        <div className="flex items-center gap-4">
          <span>空格键: {isPlaying ? '暂停' : '播放'}</span>
          <span>R键: 重新开始</span>
        </div>
        <div className="flex items-center gap-4">
          <span>速度: {playbackSpeed}x</span>
          <span>音量: {isMuted ? '静音' : `${Math.round(volume * 100)}%`}</span>
        </div>
      </div>
    </div>
  );
}
