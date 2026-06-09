import { create } from 'zustand';
import type { Project, Song, Chart, ModificationLog } from '../types';
import { demoProjects, demoSongs, demoCharts, demoModificationLogs } from '../mock/demoData';

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
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  songs: [],
  charts: [],
  logs: [],
  currentProjectId: null,
  currentSongId: null,
  currentChartId: null,
  isLoading: false,
  
  setCurrentProject: (id) => set({ currentProjectId: id }),
  setCurrentSong: (id) => set({ currentSongId: id }),
  setCurrentChart: (id) => set({ currentChartId: id }),
  
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
    return newProject;
  },
  
  updateProject: (id, updates) => set(state => ({
    projects: state.projects.map(p => 
      p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
    ),
  })),
  
  deleteProject: (id) => set(state => ({
    projects: state.projects.filter(p => p.id !== id),
    songs: state.songs.filter(s => s.projectId !== id),
    charts: state.charts.filter(c => c.projectId !== id),
  })),
  
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
    return newSong;
  },
  
  updateSong: (id, updates) => set(state => ({
    songs: state.songs.map(s => s.id === id ? { ...s, ...updates } : s),
  })),
  
  deleteSong: (id) => set(state => {
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
  }),
  
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
    return newChart;
  },
  
  updateChart: (id, updates) => set(state => ({
    charts: state.charts.map(c => 
      c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
    ),
  })),
  
  deleteChart: (id) => set(state => {
    const chart = state.charts.find(c => c.id === id);
    return {
      charts: state.charts.filter(c => c.id !== id),
      projects: chart ? state.projects.map(p =>
        p.id === chart.projectId
          ? { ...p, chartIds: p.chartIds.filter(cid => cid !== id), updatedAt: new Date() }
          : p
      ) : state.projects,
    };
  }),
  
  addLog: (log) => {
    const newLog: ModificationLog = {
      ...log,
      id: generateId(),
      timestamp: new Date(),
    };
    set(state => ({ logs: [...state.logs, newLog] }));
  },
  
  addEditHistory: (log) => {
    get().addLog(log);
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
  },
}));
