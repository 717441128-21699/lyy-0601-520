import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '../store/useProjectStore';
import { useAudioStore } from '../store/useAudioStore';
import { Waveform } from '../components/ui/Waveform';
import { StatCard } from '../components/ui/StatCard';
import {
  Upload,
  Music,
  FileAudio,
  Trash2,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Info,
  Sparkles,
} from 'lucide-react';
import { formatTime, formatBPM } from '../utils/formatters';
import type { Song } from '../types';

export function AudioImport() {
  const { songs, addSong, removeSong, setCurrentSong } = useProjectStore();
  const { audioContext, loadAudioFile, isLoading, bpmResult, analyzeBPM, waveformData, currentTime, duration, isPlaying, togglePlay, seekTo } = useAudioStore();
  
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [songInfo, setSongInfo] = useState<Partial<Song> | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    const audioFiles = files.filter(f => f.type.startsWith('audio/'));
    const projectId = useProjectStore.getState().currentProjectId;
    
    if (!projectId) {
      alert('请先选择一个项目');
      return;
    }
    
    for (const file of audioFiles) {
      setSelectedFile(file);
      
      try {
        const song = await useAudioStore.getState().importAudioFile(file, projectId);
        setSongInfo(song);
        setCurrentSong(song.id);
      } catch (error) {
        console.error('Error loading audio:', error);
      }
    }
  };

  const handleRemoveSong = (songId: string) => {
    removeSong(songId);
  };

  const handleSelectSong = (song: Song) => {
    setCurrentSong(song.id);
  };

  const handleWaveformClick = (time: number) => {
    seekTo(time);
  };

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">音频导入</h1>
          <p className="text-gray-400 font-mono text-sm">导入音频文件，自动提取信息并分析BPM</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="已导入歌曲"
          value={songs.length}
          icon={Music}
          color="cyan"
          delay={0.1}
        />
        <StatCard
          title="检测BPM"
          value={bpmResult ? `${bpmResult.bpm.toFixed(1)}` : '--'}
          icon={Sparkles}
          color="pink"
          delay={0.2}
        />
        <StatCard
          title="置信度"
          value={bpmResult ? `${(bpmResult.confidence * 100).toFixed(1)}%` : '--'}
          icon={CheckCircle2}
          color="green"
          delay={0.3}
        />
        <StatCard
          title="总时长"
          value={formatTime(duration || 0)}
          icon={Play}
          color="yellow"
          delay={0.4}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`glass-card p-8 border-2 border-dashed transition-all ${
            dragActive
              ? 'border-neon-cyan bg-neon-cyan/5 shadow-neon-cyan'
              : 'border-border hover:border-neon-cyan/50'
          }`}
        >
          <input
            type="file"
            accept="audio/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
            id="audio-upload"
          />
          <label htmlFor="audio-upload" className="cursor-pointer">
            <div className="flex flex-col items-center justify-center text-center">
              <motion.div
                animate={dragActive ? { scale: 1.1, rotate: [0, -5, 5, 0] } : {}}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-cyan/20 to-neon-pink/20 flex items-center justify-center mb-4"
              >
                <Upload className="w-10 h-10 text-neon-cyan" />
              </motion.div>
              <h3 className="font-display text-xl font-semibold text-white mb-2">
                拖拽音频文件到这里
              </h3>
              <p className="text-gray-400 font-mono text-sm mb-4">
                支持 MP3、WAV、OGG、FLAC 等格式，或点击浏览文件
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
                <span className="flex items-center gap-1">
                  <FileAudio className="w-3 h-3" /> MP3
                </span>
                <span className="flex items-center gap-1">
                  <FileAudio className="w-3 h-3" /> WAV
                </span>
                <span className="flex items-center gap-1">
                  <FileAudio className="w-3 h-3" /> OGG
                </span>
                <span className="flex items-center gap-1">
                  <FileAudio className="w-3 h-3" /> FLAC
                </span>
              </div>
            </div>
          </label>
        </div>
      </motion.div>

      <AnimatePresence>
        {waveformData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-cyan to-neon-pink flex items-center justify-center shadow-neon-cyan hover:scale-105 transition-transform"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </button>
                <div>
                  <p className="text-white font-mono">{formatTime(currentTime)}</p>
                  <p className="text-xs text-gray-500 font-mono">/ {formatTime(duration || 0)}</p>
                </div>
              </div>
              {bpmResult && (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-mono">BPM</p>
                    <p className="text-neon-cyan font-display font-bold">{bpmResult.bpm.toFixed(1)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-mono">置信度</p>
                    <p className={`font-display font-bold ${bpmResult.confidence > 0.8 ? 'text-neon-green' : bpmResult.confidence > 0.5 ? 'text-neon-yellow' : 'text-neon-red'}`}>
                      {(bpmResult.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
            </div>
            <Waveform
              data={waveformData}
              color="#00f0ff"
              height={150}
              showCursor
              cursorPosition={currentTime / (duration || 1)}
              onClick={handleWaveformClick}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {songInfo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-neon-cyan" />
            歌曲信息
          </h3>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-gray-500 font-mono mb-1">标题</p>
              <p className="text-white font-mono">{songInfo.title}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-mono mb-1">艺术家</p>
              <p className="text-white font-mono">{songInfo.artist}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-mono mb-1">BPM</p>
              <p className="text-neon-cyan font-mono font-bold">{songInfo.bpm}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-mono mb-1">时长</p>
              <p className="text-white font-mono">{formatTime(songInfo.duration || 0)}</p>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card p-6"
      >
        <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-neon-cyan" />
          已导入歌曲库
        </h3>
        {songs.length > 0 ? (
          <div className="space-y-3">
            {songs.map((song) => (
              <motion.div
                key={song.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer ${
                  useProjectStore.getState().currentSongId === song.id
                    ? 'bg-neon-cyan/10 border-neon-cyan/50 shadow-neon-cyan/20'
                    : 'bg-bg-dark/50 border-border hover:border-neon-cyan/30'
                }`}
                onClick={() => handleSelectSong(song)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 flex items-center justify-center">
                    <Music className="w-6 h-6 text-neon-pink" />
                  </div>
                  <div>
                    <p className="text-white font-mono">{song.title}</p>
                    <p className="text-xs text-gray-500 font-mono">{song.artist}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-mono">BPM</p>
                    <p className="text-neon-cyan font-mono font-bold">{formatBPM(song.bpm)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-mono">时长</p>
                    <p className="text-white font-mono">{formatTime(song.duration)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-mono">采样率</p>
                    <p className="text-white font-mono">{song.sampleRate}Hz</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSong(song.id);
                    }}
                    className="p-2 rounded-lg hover:bg-neon-red/10 text-gray-400 hover:text-neon-red transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 font-mono">暂无导入的歌曲</p>
            <p className="text-xs text-gray-600 font-mono mt-1">拖拽音频文件到上方区域开始导入</p>
          </div>
        )}
      </motion.div>

      {isLoading && (
        <div className="fixed inset-0 bg-bg-dark/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-8 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 border-4 border-neon-cyan border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-white font-mono text-lg">正在分析音频...</p>
            <p className="text-gray-400 font-mono text-sm mt-2">检测BPM和节拍信息</p>
          </div>
        </div>
      )}
    </div>
  );
}
