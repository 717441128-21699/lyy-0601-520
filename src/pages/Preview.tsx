import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '../store/useProjectStore';
import { useAudioStore } from '../store/useAudioStore';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
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
  const { getCurrentSong, getCurrentChart, currentSongId } = useProjectStore();
  const {
    currentTime,
    duration,
    isPlaying,
    volume,
    togglePlay,
    seekTo,
    stop,
    setVolume,
    loadSongAudio,
    currentAudioBuffer,
    setPlaybackSpeed: setStorePlaybackSpeed,
    playbackSpeed: storePlaybackSpeed,
  } = useAudioStore();
  
  const playbackSpeed = storePlaybackSpeed;
  const setPlaybackSpeed = (speed: number) => {
    setStorePlaybackSpeed(speed);
  };
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
  const processedNotesRef = useRef<Set<string>>(new Set());
  const lastJudgeTimeRef = useRef(0);

  const song = getCurrentSong();
  const chart = getCurrentChart();
  const actualDuration = song?.duration || duration || 0;

  const pixelPerSecond = 400;
  const judgeLinePosition = 0.85;
  const lookAheadTime = 2;

  useEffect(() => {
    if (currentSongId && !currentAudioBuffer) {
      loadSongAudio(currentSongId);
    }
  }, [currentSongId, currentAudioBuffer, loadSongAudio]);

  useEffect(() => {
    if (song) {
      useAudioStore.getState().setDuration(song.duration);
      if (!currentAudioBuffer && song.duration) {
        useAudioStore.getState().setCurrentTime(0);
      }
    }
  }, [song, currentAudioBuffer]);

  const judgeNote = useCallback((note: Note, hitTime: number): JudgeResult => {
    const diff = Math.abs(hitTime - note.time);
    if (diff < 0.05) return 'perfect';
    if (diff < 0.1) return 'great';
    if (diff < 0.15) return 'good';
    return 'miss';
  }, []);

  useEffect(() => {
    if (!isPlaying || !chart || !autoPlay) return;

    const checkNotes = () => {
      const now = currentTime;
      
      chart.notes.forEach(note => {
        if (processedNotesRef.current.has(note.id)) return;

        const diff = now - note.time;
        
        if (Math.abs(diff) < 0.03) {
          const result = judgeNote(note, now);
          processedNotesRef.current.add(note.id);
          
          setHitNotes(prev => [...prev, { noteId: note.id, result, time: now }]);
          setJudgeCounts(prev => ({ ...prev, [result]: prev[result] + 1 }));
          setCombo(prev => {
            const newCombo = result === 'miss' ? 0 : prev + 1;
            setMaxCombo(max => Math.max(max, newCombo));
            return newCombo;
          });
          setLastJudge({ result, time: now });
          lastJudgeTimeRef.current = now;
        } else if (diff > 0.15) {
          processedNotesRef.current.add(note.id);
          setHitNotes(prev => [...prev, { noteId: note.id, result: 'miss', time: now }]);
          setJudgeCounts(prev => ({ ...prev, miss: prev.miss + 1 }));
          setCombo(0);
          setLastJudge({ result: 'miss', time: now });
          lastJudgeTimeRef.current = now;
        }
      });

      if (now >= actualDuration) {
        stop();
        useAudioStore.getState().setCurrentTime(actualDuration);
      }
    };

    const intervalId = setInterval(checkNotes, 16);
    return () => clearInterval(intervalId);
  }, [isPlaying, chart, autoPlay, currentTime, actualDuration, judgeNote, stop]);

  const handleTogglePlay = () => {
    if (currentTime >= actualDuration) {
      handleRestart();
      return;
    }
    togglePlay();
  };

  const handleRestart = () => {
    stop();
    seekTo(0);
    setHitNotes([]);
    setCombo(0);
    setMaxCombo(0);
    setJudgeCounts({ perfect: 0, great: 0, good: 0, miss: 0 });
    setLastJudge(null);
    processedNotesRef.current.clear();
    setTimeout(() => togglePlay(), 50);
  };

  const handleSeek = (time: number) => {
    const clampedTime = Math.max(0, Math.min(time, actualDuration));
    seekTo(clampedTime);
    processedNotesRef.current.clear();
    setHitNotes([]);
    setCombo(0);
    setJudgeCounts({ perfect: 0, great: 0, good: 0, miss: 0 });
  };

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault();
      handleTogglePlay();
    } else if (e.key === 'r' || e.key === 'R') {
      handleRestart();
    }
  }, [currentTime, actualDuration]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const visibleNotes = chart?.notes.filter(note => {
    const timeUntilJudge = note.time - currentTime;
    return timeUntilJudge > -0.5 && timeUntilJudge < lookAheadTime;
  }) || [];

  const totalNotes = chart?.notes.length || 0;
  const hitCount = hitNotes.length;
  const accuracy = hitCount > 0 
    ? ((judgeCounts.perfect * 100 + judgeCounts.great * 75 + judgeCounts.good * 50) / (hitCount * 100) * 100).toFixed(2)
    : '0.00';

  const score = judgeCounts.perfect * 300 + judgeCounts.great * 200 + judgeCounts.good * 100;

  const getNotePosition = (noteTime: number) => {
    const timeUntilJudge = noteTime - currentTime;
    const playAreaHeight = playAreaRef.current?.clientHeight || 600;
    const judgeLineY = judgeLinePosition * playAreaHeight;
    const y = judgeLineY - timeUntilJudge * pixelPerSecond;
    return y;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    handleSeek(ratio * actualDuration);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (newVolume > 0) setIsMuted(false);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setVolume(volume || 0.5);
      setIsMuted(false);
    } else {
      setVolume(0);
      setIsMuted(true);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg-dark">
      <div className="p-4 border-b border-border bg-bg-dark/80 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="font-display text-2xl font-bold text-white">试玩预览</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSeek(currentTime - 5)}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              title="后退5秒"
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
              onClick={() => handleSeek(currentTime + 5)}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              title="前进5秒"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              onClick={handleRestart}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              title="重新开始 (R)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          <div>
            <p className="text-white font-mono">{formatTime(currentTime)}</p>
            <p className="text-xs text-gray-500 font-mono">/ {formatTime(actualDuration)}</p>
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
              onClick={handleToggleMute}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
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
              className={`p-2 rounded-lg ${showJudgement ? 'bg-neon-cyan/10 text-neon-cyan' : 'bg-bg-dark/50 text-gray-400'} transition-colors`}
              title="显示判定"
            >
              {showJudgement ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowCombo(!showCombo)}
              className={`p-2 rounded-lg ${showCombo ? 'bg-neon-pink/10 text-neon-pink' : 'bg-bg-dark/50 text-gray-400'} transition-colors`}
              title="显示连击"
            >
              <Zap className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-48 p-4 border-r border-border bg-bg-dark/60 space-y-4 overflow-y-auto">
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

          <AnimatePresence>
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
          </AnimatePresence>

          <AnimatePresence>
            {showJudgement && lastJudge && currentTime - lastJudge.time < 0.5 && (
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
          </AnimatePresence>

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
                    const noteY = getNotePosition(note.time);
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
                        }`}
                        style={{ 
                          top: `${noteY}px`,
                          transform: 'translateY(-50%)',
                          boxShadow: isHit && hitResult ? `0 0 20px ${judgeColors[hitResult]}` : undefined,
                        }}
                      >
                        {note.type === 'tap' ? 'T' : note.type === 'hold' ? 'H' : note.type === 'slide' ? 'S' : 'W'}
                        {note.duration && note.duration > 0 && (
                          <div 
                            className="absolute left-0 right-0 bg-inherit opacity-50 rounded-t-lg"
                            style={{ 
                              bottom: '100%', 
                              height: `${note.duration * pixelPerSecond}px`,
                            }}
                          />
                        )}
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

      <div 
        className="h-2 bg-bg-dark border-t border-border cursor-pointer"
        onClick={handleProgressClick}
      >
        <div 
          className="h-full bg-gradient-to-r from-neon-cyan to-neon-pink transition-all duration-75"
          style={{ width: `${(currentTime / (actualDuration || 1)) * 100}%` }}
        />
      </div>

      <div className="p-2 border-t border-border bg-bg-dark/80 flex items-center justify-between text-xs text-gray-500 font-mono">
        <div className="flex items-center gap-4">
          <span>空格键: {isPlaying ? '暂停' : '播放'}</span>
          <span>R键: 重新开始</span>
        </div>
        <div className="flex items-center gap-4">
          <span>速度: {playbackSpeed}x</span>
          <span>音量: {isMuted ? '静音' : `${Math.round((isMuted ? 0 : volume) * 100)}%`}</span>
        </div>
      </div>
    </div>
  );
}
