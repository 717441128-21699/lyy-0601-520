import { create } from 'zustand';
import type { Project, Song, Chart, ModificationLog } from '../types';
import { demoProjects, demoSongs, demoCharts, demoModificationLogs } from '../mock/demoData';
import { saveToDatabase, loadFromDatabase } from '../utils/db/indexedDB';

interface ProjectState {
  projects: Project[];
  songs: Song[];
  charts: Chart[];
  logs: ModificationLog[];
  currentProjectId: string | null;
  currentSongId: string | null;
  currentChartId: string | null;
  isLoading: boolean;
  
  setCurrentProject: (id: string | null) => void;
  setCurrentSong: (id: string | null) => void;
  setCurrentChart: (id: string | null) => void;
  
  getCurrentProject: () => Project | undefined;
  getCurrentSong: () => Song | undefined;
  getCurrentChart: () => Chart | undefined;
  getProjectSongs: (projectId: string) => Song[];
  getProjectCharts: (projectId: string) => Chart[];
  getSongCharts: (songId: string) => Chart[];
  getProjectLogs: (projectId: string) => ModificationLog[];
  getEditHistory: (projectId: string) => ModificationLog[];
  removeSong: (songId: string) => void;
  
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'songIds' | 'chartIds'>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  addSong: (song: Omit<Song, 'id'>) => Song;
  updateSong: (id: string, updates: Partial<Song>) => void;
  deleteSong: (id: string) => void;
  
  addChart: (chart: Omit<Chart, 'id' | 'createdAt' | 'updatedAt'>) => Chart;
  updateChart: (id: string, updates: Partial<Chart>) => void;
  deleteChart: (id: string) => void;
  
  addLog: (log: Omit<ModificationLog, 'id' | 'timestamp'>) => void;
  addEditHistory: (log: Omit<ModificationLog, 'id' | 'timestamp'>) => void;
  
  loadDemoData: () => void;
  initializeFromDatabase: () => Promise<void>;
  saveToDatabase: () => Promise<void>;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedSave = (getState: () => ProjectState) => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(async () => {
    const state = getState();
    await saveToDatabase(
      state.projects,
      state.songs,
      state.charts,
      state.logs,
      state.currentProjectId,
      state.currentSongId,
      state.currentChartId
    );
  }, 500);
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  songs: [],
  charts: [],
  logs: [],
  currentProjectId: null,
  currentSongId: null,
  currentChartId: null,
  isLoading: true,
  
  setCurrentProject: (id) => {
    const state = get();
    if (id) {
      const projectSongs = state.songs.filter(s => s.projectId === id);
      const projectCharts = state.charts.filter(c => c.projectId === id);
      set({
        currentProjectId: id,
        currentSongId: projectSongs[0]?.id || null,
        currentChartId: projectCharts[0]?.id || null,
      });
    } else {
      set({
        currentProjectId: null,
        currentSongId: null,
        currentChartId: null,
      });
    }
    debouncedSave(get);
  },
  setCurrentSong: (id) => {
    const state = get();
    if (id) {
      const song = state.songs.find(s => s.id === id);
      const songCharts = state.charts.filter(c => c.songId === id);
      set({
        currentSongId: id,
        currentChartId: songCharts[0]?.id || null,
      });
      if (song) {
        set({ currentProjectId: song.projectId });
      }
    } else {
      set({ currentSongId: null, currentChartId: null });
    }
    debouncedSave(get);
  },
  setCurrentChart: (id) => {
    const state = get();
    if (id) {
      const chart = state.charts.find(c => c.id === id);
      if (chart) {
        set({
          currentChartId: id,
          currentSongId: chart.songId,
          currentProjectId: chart.projectId,
        });
      }
    } else {
      set({ currentChartId: null });
    }
    debouncedSave(get);
  },
  
  getCurrentProject: () => get().projects.find(p => p.id === get().currentProjectId),
  getCurrentSong: () => get().songs.find(s => s.id === get().currentSongId),
  getCurrentChart: () => get().charts.find(c => c.id === get().currentChartId),
  
  getProjectSongs: (projectId) => get().songs.filter(s => s.projectId === projectId),
  getProjectCharts: (projectId) => get().charts.filter(c => c.projectId === projectId),
  getSongCharts: (songId) => get().charts.filter(c => c.songId === songId),
  getProjectLogs: (projectId) => get().logs.filter(l => l.projectId === projectId).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
  getEditHistory: (projectId) => get().getProjectLogs(projectId),
  removeSong: (songId) => get().deleteSong(songId),
  
  addProject: (project) => {
    const newProject: Project = {
      ...project,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      songIds: [],
      chartIds: [],
    };
    set(state => ({ projects: [...state.projects, newProject] }));
    debouncedSave(get);
    return newProject;
  },
  
  updateProject: (id, updates) => {
    set(state => ({
      projects: state.projects.map(p => 
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
      ),
    }));
    debouncedSave(get);
  },
  
  deleteProject: (id) => {
    set(state => ({
      projects: state.projects.filter(p => p.id !== id),
      songs: state.songs.filter(s => s.projectId !== id),
      charts: state.charts.filter(c => c.projectId !== id),
    }));
    debouncedSave(get);
  },
  
  addSong: (song) => {
    const newSong: Song = { ...song, id: generateId() };
    set(state => ({
      songs: [...state.songs, newSong],
      projects: state.projects.map(p => 
        p.id === song.projectId 
          ? { ...p, songIds: [...p.songIds, newSong.id], updatedAt: new Date() }
          : p
      ),
    }));
    debouncedSave(get);
    return newSong;
  },
  
  updateSong: (id, updates) => {
    set(state => ({
      songs: state.songs.map(s => s.id === id ? { ...s, ...updates } : s),
    }));
    debouncedSave(get);
  },
  
  deleteSong: (id) => {
    set(state => {
      const song = state.songs.find(s => s.id === id);
      return {
        songs: state.songs.filter(s => s.id !== id),
        charts: state.charts.filter(c => c.songId !== id),
        projects: song ? state.projects.map(p => 
          p.id === song.projectId
            ? { ...p, songIds: p.songIds.filter(sid => sid !== id), updatedAt: new Date() }
            : p
        ) : state.projects,
      };
    });
    debouncedSave(get);
  },
  
  addChart: (chart) => {
    const newChart: Chart = {
      ...chart,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set(state => ({
      charts: [...state.charts, newChart],
      projects: state.projects.map(p =>
        p.id === chart.projectId
          ? { ...p, chartIds: [...p.chartIds, newChart.id], updatedAt: new Date() }
          : p
      ),
    }));
    debouncedSave(get);
    return newChart;
  },
  
  updateChart: (id, updates) => {
    set(state => ({
      charts: state.charts.map(c => 
        c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
      ),
    }));
    debouncedSave(get);
  },
  
  deleteChart: (id) => {
    set(state => {
      const chart = state.charts.find(c => c.id === id);
      return {
        charts: state.charts.filter(c => c.id !== id),
        projects: chart ? state.projects.map(p =>
          p.id === chart.projectId
            ? { ...p, chartIds: p.chartIds.filter(cid => cid !== id), updatedAt: new Date() }
            : p
        ) : state.projects,
      };
    });
    debouncedSave(get);
  },
  
  addLog: (log) => {
    const newLog: ModificationLog = {
      ...log,
      id: generateId(),
      timestamp: new Date(),
    };
    set(state => ({ logs: [...state.logs, newLog] }));
    debouncedSave(get);
  },
  
  addEditHistory: (log) => {
    get().addLog(log);
  },
  
  initializeFromDatabase: async () => {
    set({ isLoading: true });
    const data = await loadFromDatabase();
    if (data.hasData) {
      let validProjectId = data.currentProjectId;
      let validSongId = data.currentSongId;
      let validChartId = data.currentChartId;

      const projectExists = data.projects.some(p => p.id === validProjectId);
      if (!projectExists && data.projects.length > 0) {
        validProjectId = data.projects[0].id;
        const firstSong = data.songs.find(s => s.projectId === validProjectId);
        const firstChart = data.charts.find(c => c.projectId === validProjectId);
        validSongId = firstSong?.id || null;
        validChartId = firstChart?.id || null;
      }

      const songExists = validSongId && data.songs.some(s => s.id === validSongId);
      if (!songExists && validProjectId) {
        const firstSong = data.songs.find(s => s.projectId === validProjectId);
        validSongId = firstSong?.id || null;
        if (firstSong) {
          const firstChart = data.charts.find(c => c.songId === firstSong.id);
          validChartId = firstChart?.id || validChartId;
        }
      }

      const chartExists = validChartId && data.charts.some(c => c.id === validChartId);
      if (!chartExists && validSongId) {
        const firstChart = data.charts.find(c => c.songId === validSongId);
        validChartId = firstChart?.id || null;
      }

      set({
        projects: data.projects,
        songs: data.songs,
        charts: data.charts,
        logs: data.logs,
        currentProjectId: validProjectId,
        currentSongId: validSongId,
        currentChartId: validChartId,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },
  
  saveToDatabase: async () => {
    const state = get();
    await saveToDatabase(
      state.projects,
      state.songs,
      state.charts,
      state.logs,
      state.currentProjectId,
      state.currentSongId,
      state.currentChartId
    );
  },
  
  loadDemoData: () => {
    set({
      projects: demoProjects,
      songs: demoSongs,
      charts: demoCharts,
      logs: demoModificationLogs,
      currentProjectId: demoProjects[0]?.id || null,
      currentSongId: demoSongs[0]?.id || null,
      currentChartId: demoCharts[0]?.id || null,
    });
    debouncedSave(get);
  },
}));
