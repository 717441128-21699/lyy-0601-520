export interface Project {
  id: string;
  name: string;
  creator: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'reviewing' | 'completed';
  songIds: string[];
  chartIds: string[];
}

export interface Song {
  id: string;
  projectId: string;
  title: string;
  artist: string;
  audioFile: File | null;
  audioUrl?: string;
  duration: number;
  sampleRate: number;
  bitRate?: number;
  waveformData?: number[];
  bpm?: number;
  bpmConfidence?: number;
  timeSignature?: [number, number];
  offset: number;
}

export type NoteType = 'tap' | 'hold' | 'slide' | 'swing';
export type DifficultyLevel = 'easy' | 'normal' | 'hard' | 'expert' | 'master';
export type IssueSeverity = 'error' | 'warning' | 'info';
export type IssueType = 'overlap' | 'too_dense' | 'misaligned' | 'missing_sound' | 'difficulty_spike' | 'empty_measure' | 'timing_error';

export interface Track {
  id: string;
  chartId: string;
  index: number;
  name: string;
  color: string;
  keyBind: string;
}

export interface Note {
  id: string;
  chartId: string;
  trackIndex: number;
  time: number;
  type: NoteType;
  duration?: number;
  hitSound?: string;
  isSelected?: boolean;
}

export interface TimingMarker {
  id: string;
  chartId: string;
  time: number;
  type: 'beat' | 'measure' | 'custom';
  label?: string;
  bpm?: number;
}

export interface Chart {
  id: string;
  songId: string;
  projectId: string;
  name: string;
  difficulty: DifficultyLevel;
  difficultyLevel: number;
  bpm: number;
  trackCount: number;
  offset: number;
  notes: Note[];
  timingMarkers: TimingMarker[];
  tracks: Track[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BeatMarker {
  time: number;
  beat: number;
  measure: number;
  isDownbeat: boolean;
}

export interface MeasureMarker {
  time: number;
  measure: number;
  beatCount: number;
}

export interface BeatGrid {
  bpm: number;
  offset: number;
  beats: BeatMarker[];
  measures: MeasureMarker[];
  timeSignature: [number, number];
}

export interface HeatMapZone {
  id: string;
  chartId: string;
  startTime: number;
  endTime: number;
  density: number;
  intensity: 'low' | 'medium' | 'high' | 'extreme';
}

export interface ValidationIssue {
  id: string;
  chartId: string;
  type: IssueType;
  severity: IssueSeverity;
  description: string;
  time: number;
  trackIndex?: number;
  noteIds?: string[];
  isFixed: boolean;
  suggestion?: string;
}

export interface ValidationReport {
  chartId: string;
  totalIssues: number;
  issues: ValidationIssue[];
  estimatedDifficulty: number;
  noteDensity: number[];
  heatZones: HeatMapZone[];
  passedChecks: string[];
  averageNPS: number;
  maxNPS: number;
  totalNotes: number;
}

export interface BPMResult {
  bpm: number;
  confidence: number;
  beats: number[];
  intervals: number[];
  offset: number;
}

export interface ModificationLog {
  id: string;
  projectId: string;
  chartId?: string;
  action: string;
  type?: string;
  description: string;
  timestamp: Date;
  user: string;
  diff?: string;
  previousVersion?: string;
  newVersion?: string;
}

export interface BatchOperation {
  type: 'offset' | 'rename' | 'replace_sound' | 'export' | 'validate' | 'align';
  params: Record<string, any>;
}

export interface BatchResult {
  successCount: number;
  failedCount: number;
  results: Array<{ chartId: string; success: boolean; message?: string }>;
}

export interface JudgementWindow {
  perfect: number;
  great: number;
  good: number;
  miss: number;
}

export type ExportFormat = 'json' | 'osu' | 'bms' | 'chart' | 'zip';

export interface ExportOptions {
  format: ExportFormat;
  includeAudio: boolean;
  includeEffects: boolean;
  compress: boolean;
}

export interface ValidationRule {
  id: IssueType;
  name: string;
  description: string;
  severity: IssueSeverity;
  check: (chart: Chart) => ValidationIssue[];
}

export interface VersionDiff {
  chartId: string;
  versionA: string;
  versionB: string;
  addedNotes: Note[];
  removedNotes: Note[];
  modifiedNotes: Array<{ old: Note; new: Note }>;
  timingChanges: Array<{ old: number; new: number }>;
  bpmChanges: Array<{ old: number; new: number }>;
  difficultyDiff: number;
  similarity: number;
  changes: Array<{ type: string; description: string; time?: number }>;
}

export type EditHistory = ModificationLog;
