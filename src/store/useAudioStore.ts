import { create } from 'zustand';
import type { Song, BPMResult } from '../types';
import { detectBPM, generateWaveform, getAudioMetadata, estimateBitRate } from '../utils/audio/bpmDetector';
import { useProjectStore } from './useProjectStore';

interface AudioState {
  audioContext: AudioContext | null;
  currentAudioBuffer: AudioBuffer | null;
  currentSource: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  isAnalyzing: boolean;
  analysisProgress: number;
  bpmResult: BPMResult | null;
  waveformData: number[];
  volume: number;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  
  initAudioContext: () => void;
  closeAudioContext: () => void;
  
  loadAudioFile: (file: File, songId: string) => Promise<void>;
  analyzeBPM: (audioBuffer: AudioBuffer) => Promise<BPMResult>;
  generateWaveformData: (audioBuffer: AudioBuffer, samples?: number) => number[];
  
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  seekTo: (time: number) => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  
  importAudioFile: (file: File, projectId: string) => Promise<Song>;
  batchImportAudioFiles: (files: File[], projectId: string, onProgress?: (current: number, total: number) => void) => Promise<Song[]>;
  loadSongAudio: (songId: string) => Promise<void>;
  
  clear: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useAudioStore = create<AudioState>((set, get) => ({
  audioContext: null,
  currentAudioBuffer: null,
  currentSource: null,
  gainNode: null,
  isAnalyzing: false,
  analysisProgress: 0,
  bpmResult: null,
  waveformData: [],
  volume: 0.8,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  
  initAudioContext: () => {
    if (!get().audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      gainNode.gain.value = get().volume;
      set({ audioContext: ctx, gainNode });
    }
  },
  
  closeAudioContext: () => {
    const { audioContext, currentSource } = get();
    if (currentSource) {
      try { currentSource.stop(); } catch (e) {}
    }
    if (audioContext) {
      audioContext.close();
    }
    set({ audioContext: null, currentSource: null, gainNode: null });
  },
  
  loadAudioFile: async (file, songId) => {
    const { initAudioContext, audioContext } = get();
    initAudioContext();
    
    set({ isLoading: true });
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = audioContext || get().audioContext;
      if (!ctx) throw new Error('AudioContext not initialized');
      
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const metadata = await getAudioMetadata(file);
      const bitRate = estimateBitRate(file, metadata.duration);
      
      const waveformData = get().generateWaveformData(audioBuffer);
      
      useProjectStore.getState().updateSong(songId, {
        duration: metadata.duration,
        sampleRate: audioBuffer.sampleRate,
        bitRate,
        waveformData,
        audioFile: file,
      });
      
      set({
        currentAudioBuffer: audioBuffer,
        waveformData,
        isLoading: false,
      });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },
  
  analyzeBPM: async (audioBuffer) => {
    set({ isAnalyzing: true, analysisProgress: 0 });
    
    const totalSteps = 10;
    for (let i = 1; i <= totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      set({ analysisProgress: (i / totalSteps) * 100 });
    }
    
    const result = await detectBPM(audioBuffer);
    
    set({ bpmResult: result, isAnalyzing: false, analysisProgress: 100 });
    return result;
  },
  
  generateWaveformData: (audioBuffer, samples = 500) => {
    const waveform = generateWaveform(audioBuffer, samples);
    set({ waveformData: waveform });
    return waveform;
  },
  
  play: () => {
    const { audioContext, currentAudioBuffer, gainNode, volume, currentTime } = get();
    if (!audioContext || !currentAudioBuffer) return;
    
    get().stop();
    
    const source = audioContext.createBufferSource();
    source.buffer = currentAudioBuffer;
    source.connect(gainNode!);
    
    if (gainNode) {
      gainNode.gain.value = volume;
    }
    
    source.start(0, currentTime);
    set({ currentSource: source, isPlaying: true });
    
    const startTime = audioContext.currentTime;
    const startOffset = currentTime;
    
    const updateTime = () => {
      const state = get();
      if (state.isPlaying && state.currentSource === source) {
        const elapsed = state.audioContext?.currentTime ? state.audioContext.currentTime - startTime : 0;
        const newTime = Math.min(startOffset + elapsed, state.currentAudioBuffer?.duration || 0);
        set({ currentTime: newTime });
        requestAnimationFrame(updateTime);
      }
    };
    requestAnimationFrame(updateTime);
    
    source.onended = () => {
      const state = get();
      if (state.currentSource === source) {
        set({ currentSource: null, isPlaying: false, currentTime: 0 });
      }
    };
  },
  
  pause: () => {
    const { currentSource } = get();
    if (currentSource) {
      try { currentSource.stop(); } catch (e) {}
      set({ currentSource: null, isPlaying: false });
    }
  },
  
  stop: () => {
    const { currentSource } = get();
    if (currentSource) {
      try { currentSource.stop(); } catch (e) {}
      set({ currentSource: null, isPlaying: false, currentTime: 0 });
    }
  },
  
  seek: (_time) => {
    // Seek functionality would need to track current playback time
    // This is a simplified version
  },
  
  seekTo: (time) => {
    set({ currentTime: Math.max(0, Math.min(time, get().duration)) });
  },
  
  togglePlay: () => {
    const { isPlaying, play, pause } = get();
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  },
  
  setVolume: (volume) => {
    const { gainNode } = get();
    if (gainNode) {
      gainNode.gain.value = volume;
    }
    set({ volume });
  },
  
  setCurrentTime: (time) => {
    set({ currentTime: Math.max(0, Math.min(time, get().duration)) });
  },
  
  setDuration: (duration) => {
    set({ duration: Math.max(0, duration) });
  },
  
  importAudioFile: async (file, projectId) => {
    const { initAudioContext, audioContext, analyzeBPM } = get();
    initAudioContext();
    
    set({ isLoading: true });
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = audioContext || get().audioContext;
      if (!ctx) throw new Error('AudioContext not initialized');
      
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const metadata = await getAudioMetadata(file);
      const bitRate = estimateBitRate(file, metadata.duration);
      const waveformData = generateWaveform(audioBuffer);
      
      const bpmResult = await analyzeBPM(audioBuffer);
      
      const song = useProjectStore.getState().addSong({
        projectId,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Unknown Artist',
        audioFile: file,
        duration: metadata.duration,
        sampleRate: audioBuffer.sampleRate,
        bitRate,
        waveformData,
        bpm: bpmResult.bpm,
        bpmConfidence: bpmResult.confidence,
        timeSignature: [4, 4],
        offset: 0,
      });
      
      set({
        currentAudioBuffer: audioBuffer,
        waveformData,
        bpmResult,
        duration: metadata.duration,
        currentTime: 0,
        isLoading: false,
      });
      
      return song;
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },
  
  loadSongAudio: async (songId: string) => {
    const { initAudioContext, audioContext, analyzeBPM } = get();
    const song = useProjectStore.getState().songs.find(s => s.id === songId);
    
    if (!song || !song.audioFile) return;
    
    initAudioContext();
    set({ isLoading: true });
    
    try {
      const arrayBuffer = await song.audioFile.arrayBuffer();
      const ctx = audioContext || get().audioContext;
      if (!ctx) throw new Error('AudioContext not initialized');
      
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      
      let bpmResult = get().bpmResult;
      if (!bpmResult && song.bpm) {
        bpmResult = {
          bpm: song.bpm,
          confidence: song.bpmConfidence || 0.8,
          beats: [],
          intervals: [],
          offset: song.offset || 0,
        };
      } else if (!bpmResult) {
        bpmResult = await analyzeBPM(audioBuffer);
      }
      
      const waveformData = song.waveformData?.length ? song.waveformData : generateWaveform(audioBuffer);
      
      set({
        currentAudioBuffer: audioBuffer,
        waveformData,
        bpmResult,
        duration: song.duration,
        currentTime: 0,
        isLoading: false,
      });
    } catch (e) {
      console.error('Failed to load song audio:', e);
      set({ isLoading: false });
    }
  },
  
  batchImportAudioFiles: async (files, projectId, onProgress) => {
    const songs: Song[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const song = await get().importAudioFile(files[i], projectId);
      songs.push(song);
      
      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    }
    
    return songs;
  },
  
  clear: () => set({
    currentAudioBuffer: null,
    currentSource: null,
    bpmResult: null,
    waveformData: [],
    isAnalyzing: false,
    analysisProgress: 0,
  }),
}));
