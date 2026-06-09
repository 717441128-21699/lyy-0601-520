import Dexie, { Table } from 'dexie';
import type { Project, Song, Chart, ModificationLog } from '../../types';

export interface PersistedProject extends Omit<Project, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

export interface PersistedSong extends Omit<Song, 'audioFile'> {
  audioFile?: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
}

export interface PersistedChart extends Omit<Chart, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

export interface PersistedLog extends Omit<ModificationLog, 'timestamp'> {
  timestamp: string;
}

export interface AppState {
  id: 'current';
  currentProjectId: string | null;
  currentSongId: string | null;
  currentChartId: string | null;
  lastModified: string;
}

export class RhythmChartDatabase extends Dexie {
  projects!: Table<PersistedProject>;
  songs!: Table<PersistedSong>;
  charts!: Table<PersistedChart>;
  logs!: Table<PersistedLog>;
  appState!: Table<AppState>;

  constructor() {
    super('RhythmChartDB');
    this.version(1).stores({
      projects: 'id, name, createdAt, updatedAt',
      songs: 'id, projectId, title, artist',
      charts: 'id, projectId, songId, name, difficulty',
      logs: 'id, projectId, chartId, timestamp',
      appState: 'id',
    });
  }
}

export const db = new RhythmChartDatabase();

export const serializeDate = (date: Date): string => date.toISOString();
export const deserializeDate = (dateStr: string): Date => new Date(dateStr);

export async function saveToDatabase(
  projects: Project[],
  songs: Song[],
  charts: Chart[],
  logs: ModificationLog[],
  currentProjectId: string | null,
  currentSongId: string | null,
  currentChartId: string | null
): Promise<void> {
  try {
    await db.transaction('rw', [db.projects, db.songs, db.charts, db.logs, db.appState], async () => {
      await db.projects.clear();
      await db.songs.clear();
      await db.charts.clear();
      await db.logs.clear();

      const persistedProjects: PersistedProject[] = projects.map(p => ({
        ...p,
        createdAt: serializeDate(p.createdAt),
        updatedAt: serializeDate(p.updatedAt),
      }));
      await db.projects.bulkAdd(persistedProjects);

      const persistedSongs: PersistedSong[] = songs.map(s => ({
        ...s,
        audioFile: s.audioFile ? {
          name: s.audioFile.name,
          size: s.audioFile.size,
          type: s.audioFile.type,
          lastModified: s.audioFile.lastModified,
        } : undefined,
      }));
      await db.songs.bulkAdd(persistedSongs);

      const persistedCharts: PersistedChart[] = charts.map(c => ({
        ...c,
        createdAt: serializeDate(c.createdAt),
        updatedAt: serializeDate(c.updatedAt),
      }));
      await db.charts.bulkAdd(persistedCharts);

      const persistedLogs: PersistedLog[] = logs.map(l => ({
        ...l,
        timestamp: serializeDate(l.timestamp),
      }));
      await db.logs.bulkAdd(persistedLogs);

      await db.appState.put({
        id: 'current',
        currentProjectId,
        currentSongId,
        currentChartId,
        lastModified: serializeDate(new Date()),
      });
    });
  } catch (error) {
    console.error('保存到数据库失败:', error);
  }
}

export async function loadFromDatabase(): Promise<{
  projects: Project[];
  songs: Song[];
  charts: Chart[];
  logs: ModificationLog[];
  currentProjectId: string | null;
  currentSongId: string | null;
  currentChartId: string | null;
  hasData: boolean;
}> {
  try {
    const [projects, songs, charts, logs, appState] = await Promise.all([
      db.projects.toArray(),
      db.songs.toArray(),
      db.charts.toArray(),
      db.logs.toArray(),
      db.appState.get('current'),
    ]);

    if (projects.length === 0) {
      return {
        projects: [],
        songs: [],
        charts: [],
        logs: [],
        currentProjectId: null,
        currentSongId: null,
        currentChartId: null,
        hasData: false,
      };
    }

    const restoredProjects: Project[] = projects.map(p => ({
      ...p,
      createdAt: deserializeDate(p.createdAt),
      updatedAt: deserializeDate(p.updatedAt),
    }));

    const restoredSongs: Song[] = songs.map(s => ({
      ...s,
      audioFile: undefined,
    }));

    const restoredCharts: Chart[] = charts.map(c => ({
      ...c,
      createdAt: deserializeDate(c.createdAt),
      updatedAt: deserializeDate(c.updatedAt),
    }));

    const restoredLogs: ModificationLog[] = logs.map(l => ({
      ...l,
      timestamp: deserializeDate(l.timestamp),
    }));

    return {
      projects: restoredProjects,
      songs: restoredSongs,
      charts: restoredCharts,
      logs: restoredLogs,
      currentProjectId: appState?.currentProjectId || null,
      currentSongId: appState?.currentSongId || null,
      currentChartId: appState?.currentChartId || null,
      hasData: true,
    };
  } catch (error) {
    console.error('从数据库加载失败:', error);
    return {
      projects: [],
      songs: [],
      charts: [],
      logs: [],
      currentProjectId: null,
      currentSongId: null,
      currentChartId: null,
      hasData: false,
    };
  }
}

export async function clearDatabase(): Promise<void> {
  try {
    await db.delete();
    await db.open();
  } catch (error) {
    console.error('清除数据库失败:', error);
  }
}
