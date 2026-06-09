import { create } from 'zustand';
import type { Note, BeatGrid, TimingMarker, Chart } from '../types';
import { snapAllNotesToGrid, generateBeatGrid, adjustOffset } from '../utils/beat/beatGrid';
import { useProjectStore } from './useProjectStore';

interface EditorState {
  selectedNoteIds: string[];
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
  snapDivision: number;
  beatGrid: BeatGrid | null;
  showGrid: boolean;
  showWaveform: boolean;
  playbackSpeed: number;
  scrollPosition: number;
  selectedTool: 'select' | 'tap' | 'hold' | 'slide' | 'swing';
  
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  setSnapDivision: (division: number) => void;
  setShowGrid: (show: boolean) => void;
  setShowWaveform: (show: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setScrollPosition: (pos: number) => void;
  setSelectedTool: (tool: EditorState['selectedTool']) => void;
  
  generateBeatGridForChart: (chart: Chart) => void;
  setBeatGrid: (grid: BeatGrid | null) => void;
  
  toggleNoteSelection: (noteId: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  selectAllNotes: (chartId: string) => void;
  selectNotesInRange: (startTime: number, endTime: number, trackIndex?: number) => void;
  
  addNote: (chartId: string, note: Omit<Note, 'id' | 'chartId'>) => Note;
  updateNote: (noteId: string, updates: Partial<Note>) => void;
  deleteNote: (noteId: string) => void;
  deleteSelectedNotes: () => void;
  moveSelectedNotes: (timeOffset: number, trackOffset: number) => void;
  
  snapAllNotes: (chartId: string) => void;
  snapSelectedNotes: (chartId: string) => void;
  adjustAllNotesOffset: (chartId: string, offset: number) => void;
  
  addTimingMarker: (chartId: string, marker: Omit<TimingMarker, 'id' | 'chartId'>) => TimingMarker;
  updateTimingMarker: (markerId: string, updates: Partial<TimingMarker>) => void;
  deleteTimingMarker: (markerId: string) => void;
  
  clearAll: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useEditorStore = create<EditorState>((set, get) => ({
  selectedNoteIds: [],
  currentTime: 0,
  isPlaying: false,
  zoom: 1,
  snapDivision: 4,
  beatGrid: null,
  showGrid: true,
  showWaveform: true,
  playbackSpeed: 1,
  scrollPosition: 0,
  selectedTool: 'select',
  
  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4, zoom)) }),
  setSnapDivision: (division) => set({ snapDivision: division }),
  setShowGrid: (show) => set({ showGrid: show }),
  setShowWaveform: (show) => set({ showWaveform: show }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: Math.max(0.25, Math.min(2, speed)) }),
  setScrollPosition: (pos) => set({ scrollPosition: pos }),
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  
  generateBeatGridForChart: (chart) => {
    const song = useProjectStore.getState().getCurrentSong();
    const duration = song?.duration || 180;
    const grid = generateBeatGrid(chart.bpm, chart.offset, duration, chart.timingMarkers[0]?.bpm ? [4, 4] : [4, 4]);
    set({ beatGrid: grid });
  },
  
  setBeatGrid: (grid) => set({ beatGrid: grid }),
  
  toggleNoteSelection: (noteId, multiSelect = false) => set(state => {
    if (multiSelect) {
      return {
        selectedNoteIds: state.selectedNoteIds.includes(noteId)
          ? state.selectedNoteIds.filter(id => id !== noteId)
          : [...state.selectedNoteIds, noteId],
      };
    }
    return {
      selectedNoteIds: state.selectedNoteIds.includes(noteId) && state.selectedNoteIds.length === 1
        ? []
        : [noteId],
    };
  }),
  
  clearSelection: () => set({ selectedNoteIds: [] }),
  
  selectAllNotes: (chartId) => {
    const chart = useProjectStore.getState().charts.find(c => c.id === chartId);
    if (chart) {
      set({ selectedNoteIds: chart.notes.map(n => n.id) });
    }
  },
  
  selectNotesInRange: (startTime, endTime, trackIndex) => {
    const chart = useProjectStore.getState().getCurrentChart();
    if (!chart) return;
    
    const notes = chart.notes.filter(n => {
      const inTime = n.time >= startTime && n.time <= endTime;
      const inTrack = trackIndex === undefined || n.trackIndex === trackIndex;
      return inTime && inTrack;
    });
    
    set({ selectedNoteIds: notes.map(n => n.id) });
  },
  
  addNote: (chartId, note) => {
    const newNote: Note = {
      ...note,
      id: generateId(),
      chartId,
    };
    
    useProjectStore.getState().updateChart(chartId, {
      notes: [...useProjectStore.getState().charts.find(c => c.id === chartId)!.notes, newNote].sort((a, b) => a.time - b.time),
    });
    
    set({ selectedNoteIds: [newNote.id] });
    useProjectStore.getState().forceSave();
    return newNote;
  },
  
  updateNote: (noteId, updates) => {
    const chart = useProjectStore.getState().getCurrentChart();
    if (!chart) return;
    
    const updatedNotes = chart.notes.map(n =>
      n.id === noteId ? { ...n, ...updates } : n
    ).sort((a, b) => a.time - b.time);
    
    useProjectStore.getState().updateChart(chart.id, { notes: updatedNotes });
    useProjectStore.getState().forceSave();
  },
  
  deleteNote: (noteId) => {
    const chart = useProjectStore.getState().getCurrentChart();
    if (!chart) return;
    
    useProjectStore.getState().updateChart(chart.id, {
      notes: chart.notes.filter(n => n.id !== noteId),
    });
    
    set(state => ({
      selectedNoteIds: state.selectedNoteIds.filter(id => id !== noteId),
    }));
    useProjectStore.getState().forceSave();
  },
  
  deleteSelectedNotes: () => {
    const { selectedNoteIds } = get();
    const chart = useProjectStore.getState().getCurrentChart();
    if (!chart || selectedNoteIds.length === 0) return;
    
    useProjectStore.getState().updateChart(chart.id, {
      notes: chart.notes.filter(n => !selectedNoteIds.includes(n.id)),
    });
    
    set({ selectedNoteIds: [] });
    useProjectStore.getState().forceSave();
  },
  
  moveSelectedNotes: (timeOffset, trackOffset) => {
    const { selectedNoteIds } = get();
    const chart = useProjectStore.getState().getCurrentChart();
    if (!chart || selectedNoteIds.length === 0) return;
    
    const updatedNotes = chart.notes.map(n => {
      if (selectedNoteIds.includes(n.id)) {
        const newTrackIndex = Math.max(0, Math.min(chart.trackCount - 1, n.trackIndex + trackOffset));
        return {
          ...n,
          time: Math.max(0, n.time + timeOffset),
          trackIndex: newTrackIndex,
        };
      }
      return n;
    }).sort((a, b) => a.time - b.time);
    
    useProjectStore.getState().updateChart(chart.id, { notes: updatedNotes });
    useProjectStore.getState().forceSave();
  },
  
  snapAllNotes: (chartId) => {
    const chart = useProjectStore.getState().charts.find(c => c.id === chartId);
    const { beatGrid, snapDivision } = get();
    if (!chart || !beatGrid) return;
    
    const snappedNotes = snapAllNotesToGrid(chart.notes, beatGrid, snapDivision);
    useProjectStore.getState().updateChart(chartId, { notes: snappedNotes });
    useProjectStore.getState().forceSave();
  },
  
  snapSelectedNotes: (chartId) => {
    const { selectedNoteIds, beatGrid, snapDivision } = get();
    const chart = useProjectStore.getState().charts.find(c => c.id === chartId);
    if (!chart || !beatGrid || selectedNoteIds.length === 0) return;
    
    const updatedNotes = chart.notes.map(n => {
      if (selectedNoteIds.includes(n.id)) {
        const beatInterval = 60 / beatGrid.bpm;
        const snapInterval = beatInterval / snapDivision;
        const snapped = Math.round((n.time - beatGrid.offset) / snapInterval) * snapInterval + beatGrid.offset;
        return { ...n, time: Math.round(snapped * 1000) / 1000 };
      }
      return n;
    }).sort((a, b) => a.time - b.time);
    
    useProjectStore.getState().updateChart(chartId, { notes: updatedNotes });
    useProjectStore.getState().forceSave();
  },
  
  adjustAllNotesOffset: (chartId, offset) => {
    const chart = useProjectStore.getState().charts.find(c => c.id === chartId);
    if (!chart) return;
    
    const adjustedNotes = adjustOffset(chart.notes, offset);
    useProjectStore.getState().updateChart(chartId, { 
      notes: adjustedNotes,
      offset: chart.offset + offset,
    });
    useProjectStore.getState().forceSave();
  },
  
  addTimingMarker: (chartId, marker) => {
    const newMarker: TimingMarker = {
      ...marker,
      id: generateId(),
      chartId,
    };
    
    const chart = useProjectStore.getState().charts.find(c => c.id === chartId);
    if (chart) {
      useProjectStore.getState().updateChart(chartId, {
        timingMarkers: [...chart.timingMarkers, newMarker].sort((a, b) => a.time - b.time),
      });
      useProjectStore.getState().forceSave();
    }
    
    return newMarker;
  },
  
  updateTimingMarker: (markerId, updates) => {
    const chart = useProjectStore.getState().getCurrentChart();
    if (!chart) return;
    
    const updatedMarkers = chart.timingMarkers.map(m =>
      m.id === markerId ? { ...m, ...updates } : m
    ).sort((a, b) => a.time - b.time);
    
    useProjectStore.getState().updateChart(chart.id, { timingMarkers: updatedMarkers });
    useProjectStore.getState().forceSave();
  },
  
  deleteTimingMarker: (markerId) => {
    const chart = useProjectStore.getState().getCurrentChart();
    if (!chart) return;
    
    useProjectStore.getState().updateChart(chart.id, {
      timingMarkers: chart.timingMarkers.filter(m => m.id !== markerId),
    });
    useProjectStore.getState().forceSave();
  },
  
  clearAll: () => set({
    selectedNoteIds: [],
    currentTime: 0,
    isPlaying: false,
    zoom: 1,
    beatGrid: null,
  }),
}));
