import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '../store/useProjectStore';
import { useEditorStore } from '../store/useEditorStore';
import { useAudioStore } from '../store/useAudioStore';
import { NoteBlock } from '../components/ui/NoteBlock';
import { Waveform } from '../components/ui/Waveform';
import { StatCard } from '../components/ui/StatCard';
import {
  MousePointer,
  Pencil,
  Eraser,
  Hand,
  ZoomIn,
  ZoomOut,
  Magnet,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Trash2,
  Copy,
  Settings,
  Layers,
  Music,
  Clock,
  Target,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatTime } from '../utils/formatters';
import type { Note, NoteType } from '../types';

const trackColors = [
  'from-neon-cyan/20 to-neon-cyan/5',
  'from-neon-pink/20 to-neon-pink/5',
  'from-neon-green/20 to-neon-green/5',
  'from-neon-yellow/20 to-neon-yellow/5',
  'from-neon-purple/20 to-neon-purple/5',
  'from-neon-red/20 to-neon-red/5',
];

export function TrackEditor() {
  const { getCurrentSong, getCurrentChart, addEditHistory } = useProjectStore();
  const { 
    selectedTool, 
    setSelectedTool,
    selectedNoteIds,
    toggleNoteSelection,
    clearSelection,
    selectAllNotes,
    zoom,
    setZoom,
    snapDivision,
    setSnapDivision,
    beatGrid,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    addNote,
    updateNote,
    deleteNote,
    deleteSelectedNotes,
    moveSelectedNotes,
  } = useEditorStore();
  const { waveformData } = useAudioStore();
  const song = getCurrentSong();
  const duration = song?.duration || 0;
  
  const [scrollX, setScrollX] = useState(0);
  const [visibleTracks, setVisibleTracks] = useState<number[]>([0, 1, 2, 3]);
  const [showJudgeWindow, setShowJudgeWindow] = useState(true);
  const [holdStart, setHoldStart] = useState<{ track: number; time: number } | null>(null);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const playIntervalRef = useRef<number | null>(null);

  const chart = getCurrentChart();
  
  const pixelPerSecond = 100 * zoom;
  const totalWidth = Math.max((duration || 0) * pixelPerSecond, 2000);
  const trackHeight = 80;
  const currentTimeRef = useRef(0);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    if (isPlaying && duration) {
      playIntervalRef.current = window.setInterval(() => {
        const prev = currentTimeRef.current;
        if (prev >= duration) {
          setIsPlaying(false);
          setCurrentTime(0);
          currentTimeRef.current = 0;
        } else {
          const newTime = prev + 0.05;
          setCurrentTime(newTime);
          currentTimeRef.current = newTime;
        }
      }, 50);
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
  }, [isPlaying, duration, setCurrentTime, setIsPlaying]);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, [setCurrentTime]);

  const handleNoteSelect = useCallback((noteId: string, multiSelect?: boolean) => {
    toggleNoteSelection(noteId, multiSelect);
  }, [toggleNoteSelection]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!editorRef.current || !chart) return;
    
    const rect = editorRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollX;
    const y = e.clientY - rect.top;
    
    const time = x / pixelPerSecond;
    const trackIndex = Math.floor((y - 60) / trackHeight);
    
    if ((selectedTool as string) === 'select') {
      clearSelection();
    } else if (trackIndex >= 0 && trackIndex < 6) {
      const snappedTime = beatGrid ? snapToGrid(time, beatGrid, snapDivision) : time;
      
      if (selectedTool === 'hold' || selectedTool === 'slide') {
        if (!holdStart) {
          setHoldStart({ track: trackIndex, time: snappedTime });
        } else {
          addNote(chart.id, {
            trackIndex: trackIndex,
            time: holdStart.time,
            type: selectedTool,
            duration: Math.max(snappedTime - holdStart.time, 0.2),
          });
          setHoldStart(null);
          addEditHistory({
            projectId: chart.projectId,
            chartId: chart.id,
            action: 'add_note',
            description: `添加 ${selectedTool.toUpperCase()} 音符`,
            user: '谱师',
          });
        }
      } else {
        addNote(chart.id, {
          trackIndex: trackIndex,
          time: snappedTime,
          type: selectedTool as NoteType,
        });
        addEditHistory({
          projectId: chart.projectId,
          chartId: chart.id,
          action: 'add_note',
          description: `添加 ${selectedTool.toUpperCase()} 音符`,
          user: '谱师',
        });
      }
    }
  }, [chart, selectedTool, beatGrid, snapDivision, pixelPerSecond, scrollX, holdStart, addNote, clearSelection, addEditHistory]);

  const handleDeleteSelected = useCallback(() => {
    if (!chart) return;
    deleteSelectedNotes();
    addEditHistory({
      projectId: chart.projectId,
      chartId: chart.id,
      action: 'delete_notes',
      description: `批量删除 ${selectedNoteIds.length} 个音符`,
      user: '谱师',
    });
  }, [chart, selectedNoteIds.length, deleteSelectedNotes, addEditHistory]);

  const handleDuplicateSelected = useCallback(() => {
    if (!chart) return;
    moveSelectedNotes(0.5, 0);
    addEditHistory({
      projectId: chart.projectId,
      chartId: chart.id,
      action: 'move_notes',
      description: `移动 ${selectedNoteIds.length} 个音符`,
      user: '谱师',
    });
  }, [chart, selectedNoteIds.length, moveSelectedNotes, addEditHistory]);

  const handleSelectAll = useCallback(() => {
    if (chart) {
      selectAllNotes(chart.id);
    }
  }, [chart, selectAllNotes]);

  const snapToGrid = (time: number, grid: any, division: number): number => {
    const beatInterval = 60 / (song?.bpm || 120);
    const snapInterval = beatInterval / (division / 4);
    return Math.round(time / snapInterval) * snapInterval;
  };

  const tools = [
    { id: 'select', icon: MousePointer, label: '选择' },
    { id: 'tap', icon: Pencil, label: 'Tap' },
    { id: 'hold', icon: Layers, label: 'Hold' },
    { id: 'slide', icon: Hand, label: 'Slide' },
    { id: 'swing', icon: Music, label: 'Swing' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border bg-bg-dark/80 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="font-display text-2xl font-bold text-white">轨道编辑</h1>
            <div className="flex items-center gap-1 bg-bg-dark/50 rounded-lg p-1">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id as typeof selectedTool)}
                  className={`p-2 rounded-lg transition-all ${
                    selectedTool === tool.id
                      ? 'bg-neon-cyan/20 text-neon-cyan'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={tool.label}
                >
                  <tool.icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            <div className="h-8 w-px bg-border" />

            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                className="p-2 rounded-lg bg-bg-dark/50 text-gray-400 hover:text-white"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-400 font-mono w-16 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(Math.min(4, zoom + 0.25))}
                className="p-2 rounded-lg bg-bg-dark/50 text-gray-400 hover:text-white"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <div className="h-8 w-px bg-border" />

            <div className="flex items-center gap-2">
              <Magnet className="w-4 h-4 text-neon-cyan" />
              <select
                value={snapDivision}
                onChange={(e) => setSnapDivision(parseInt(e.target.value))}
                className="bg-bg-dark/50 border border-border rounded-lg px-2 py-1 text-sm text-white font-mono focus:outline-none focus:border-neon-cyan"
              >
                <option value={4}>1/4</option>
                <option value={8}>1/8</option>
                <option value={16}>1/16</option>
                <option value={32}>1/32</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedNoteIds.length > 0 && (
              <>
                <span className="text-xs text-gray-400 font-mono mr-2">
                  已选 {selectedNoteIds.length} 个
                </span>
                <button
                  onClick={handleDuplicateSelected}
                  className="p-2 rounded-lg bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20"
                  title="复制"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="p-2 rounded-lg bg-neon-red/10 text-neon-red hover:bg-neon-red/20"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="h-8 w-px bg-border mx-2" />
              </>
            )}
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-lg bg-bg-dark/50 text-gray-400 hover:text-white text-sm font-mono"
            >
              全选
            </button>
            <button
              onClick={() => setShowJudgeWindow(!showJudgeWindow)}
              className={`p-2 rounded-lg ${showJudgeWindow ? 'bg-neon-cyan/10 text-neon-cyan' : 'bg-bg-dark/50 text-gray-400'}`}
              title="判定窗口"
            >
              {showJudgeWindow ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-border bg-bg-dark/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSeek(0)}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={handleTogglePlay}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-cyan to-neon-pink flex items-center justify-center shadow-neon-cyan"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white ml-0.5" />
              )}
            </button>
            <button
              onClick={() => handleSeek(duration || 0)}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <div className="ml-4">
              <p className="text-white font-mono">{formatTime(currentTime)}</p>
              <p className="text-xs text-gray-500 font-mono">/ {formatTime(duration || 0)}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-gray-500 font-mono">总音符</p>
              <p className="text-neon-cyan font-mono font-bold">{chart?.notes.length || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 font-mono">BPM</p>
              <p className="text-neon-pink font-mono font-bold">{song?.bpm || '--'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 font-mono">难度</p>
              <p className="text-neon-yellow font-mono font-bold">Lv.{chart?.difficulty || 0}</p>
            </div>
          </div>
        </div>

        {waveformData.length > 0 && (
          <div className="relative">
            <Waveform
              data={waveformData}
              color="#00f0ff"
              height={60}
              showCursor
              cursorPosition={currentTime / (duration || 1)}
              onClick={(t) => handleSeek(t * (duration || 0))}
            />
            {beatGrid && (
              <div className="absolute inset-0 pointer-events-none">
                {beatGrid.measures.map((measure, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-neon-cyan/30"
                    style={{ left: `${(measure.time / (duration || 1)) * 100}%` }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        ref={editorRef}
        className="flex-1 overflow-auto scrollbar-neon relative"
        onScroll={(e) => setScrollX(e.currentTarget.scrollLeft)}
        onClick={handleCanvasClick}
      >
        <div className="relative" style={{ width: totalWidth, minWidth: '100%' }}>
          {showJudgeWindow && (
            <div
              className="absolute top-0 bottom-0 z-10 pointer-events-none"
              style={{
                left: currentTime * pixelPerSecond,
                width: 2,
                background: 'linear-gradient(to bottom, transparent, #ff00aa, transparent)',
                boxShadow: '0 0 20px rgba(255, 0, 170, 0.8)',
              }}
            >
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-neon-pink/50"
                style={{ boxShadow: '0 0 30px rgba(255, 0, 170, 0.3)' }}
              />
            </div>
          )}

          <div className="sticky top-0 left-0 z-20 bg-bg-dark/90 backdrop-blur-sm">
            <div className="flex">
              <div className="w-20 h-12 flex items-center justify-center border-r border-border border-b border-border">
                <span className="text-xs text-gray-500 font-mono">轨道</span>
              </div>
              {[0, 1, 2, 3, 4, 5].map((track) => (
                <div
                  key={track}
                  className="flex-1 h-12 flex items-center justify-center border-r border-border border-b border-border"
                  style={{ minWidth: 100 }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setVisibleTracks(prev => 
                        prev.includes(track) ? prev.filter(t => t !== track) : [...prev, track]
                      );
                    }}
                    className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                      visibleTracks.includes(track)
                        ? 'bg-neon-cyan/20 text-neon-cyan'
                        : 'text-gray-600'
                    }`}
                  >
                    {track + 1}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {[0, 1, 2, 3, 4, 5].map((trackIndex) => {
            if (!visibleTracks.includes(trackIndex)) return null;
            
            const trackNotes = chart?.notes.filter(n => n.trackIndex === trackIndex) || [];
            
            return (
              <div key={trackIndex} className="flex">
                <div
                  className="w-20 flex items-center justify-center border-r border-border sticky left-0 bg-bg-dark/80 backdrop-blur-sm"
                  style={{ height: trackHeight }}
                >
                  <span className="text-xs font-mono text-gray-500">TRK {trackIndex + 1}</span>
                </div>
                <div
                  className={`flex-1 relative bg-gradient-to-r ${trackColors[trackIndex]} border-r border-border`}
                  style={{ height: trackHeight, minWidth: totalWidth - 80 }}
                >
                  {beatGrid && Array.from({ length: Math.ceil((duration || 0) / (60 / (song?.bpm || 120) / 4)) }).map((_, i) => {
                    const beatTime = i * (60 / (song?.bpm || 120) / 4);
                    const isMeasure = i % 4 === 0;
                    return (
                      <div
                        key={`grid-${i}`}
                        className={`absolute top-0 bottom-0 ${isMeasure ? 'w-0.5 bg-white/10' : 'w-px bg-white/5'}`}
                        style={{ left: beatTime * pixelPerSecond }}
                      />
                    );
                  })}

                  {trackNotes.map((note) => (
                    <NoteBlock
                      key={note.id}
                      note={note}
                      pixelPerSecond={pixelPerSecond}
                      trackWidth={100}
                      isSelected={selectedNoteIds.includes(note.id)}
                      onSelect={handleNoteSelect}
                    />
                  ))}

                  {holdStart && holdStart.track === trackIndex && (
                    <div
                      className="absolute h-8 border-2 border-dashed border-neon-pink/50 bg-neon-pink/10 rounded-lg"
                      style={{
                        left: holdStart.time * pixelPerSecond,
                        width: Math.max(0, (currentTime - holdStart.time) * pixelPerSecond),
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}

          <div className="h-8 flex items-center sticky bottom-0 bg-bg-dark/90 backdrop-blur-sm border-t border-border">
            <div className="w-20 flex items-center justify-center border-r border-border h-full">
              <Clock className="w-4 h-4 text-gray-500" />
            </div>
            {beatGrid && beatGrid.measures.map((measure, i) => (
              <div
                key={`time-${i}`}
                className="absolute text-xs text-gray-500 font-mono"
                style={{ left: measure.time * pixelPerSecond + 80 + 4 }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-border bg-bg-dark/80 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
          <span>缩放: {Math.round(zoom * 100)}%</span>
          <span>吸附: 1/{snapDivision}</span>
          <span>位置: {formatTime(currentTime)}</span>
          <span>音符: {chart?.notes.length || 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono">
            {holdStart ? '点击结束位置完成长音符' : selectedTool !== 'select' ? '点击轨道添加音符' : '选择工具进行编辑'}
          </span>
        </div>
      </div>
    </div>
  );
}
