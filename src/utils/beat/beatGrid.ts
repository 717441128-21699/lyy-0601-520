import type { BeatGrid, BeatMarker, MeasureMarker, Chart, Note, HeatMapZone } from '../../types';

export function generateBeatGrid(
  bpm: number,
  offset: number,
  duration: number,
  timeSignature: [number, number] = [4, 4]
): BeatGrid {
  const [beatsPerMeasure, beatUnit] = timeSignature;
  const beatInterval = 60 / bpm;
  const beats: BeatMarker[] = [];
  const measures: MeasureMarker[] = [];
  
  let beatCount = 0;
  let measureCount = 1;
  
  for (let time = offset; time < duration + beatInterval; time += beatInterval) {
    const beatInMeasure = beatCount % beatsPerMeasure;
    const isDownbeat = beatInMeasure === 0;
    
    beats.push({
      time: Math.round(time * 1000) / 1000,
      beat: beatCount + 1,
      measure: measureCount,
      isDownbeat,
    });
    
    if (isDownbeat) {
      measures.push({
        time: Math.round(time * 1000) / 1000,
        measure: measureCount,
        beatCount: beatsPerMeasure,
      });
      measureCount++;
    }
    
    beatCount++;
  }
  
  return {
    bpm,
    offset,
    beats,
    measures,
    timeSignature,
  };
}

export function snapToGrid(
  time: number,
  grid: BeatGrid,
  snapDivision: number = 4
): number {
  const beatInterval = 60 / grid.bpm;
  const snapInterval = beatInterval / snapDivision;
  
  const snapped = Math.round((time - grid.offset) / snapInterval) * snapInterval + grid.offset;
  return Math.round(snapped * 1000) / 1000;
}

export function snapNoteToGrid(
  note: Note,
  grid: BeatGrid,
  snapDivision: number = 4
): Note {
  return {
    ...note,
    time: snapToGrid(note.time, grid, snapDivision),
    duration: note.duration 
      ? Math.round(snapToGrid(note.time + note.duration, grid, snapDivision) - snapToGrid(note.time, grid, snapDivision)) * 1000 / 1000
      : undefined,
  };
}

export function snapAllNotesToGrid(
  notes: Note[],
  grid: BeatGrid,
  snapDivision: number = 4
): Note[] {
  return notes.map(note => snapNoteToGrid(note, grid, snapDivision));
}

export function getBeatAtTime(time: number, grid: BeatGrid): number {
  return ((time - grid.offset) * grid.bpm) / 60;
}

export function getMeasureAtTime(time: number, grid: BeatGrid): number {
  const beat = getBeatAtTime(time, grid);
  return Math.floor(beat / grid.timeSignature[0]) + 1;
}

export function calculateHeatMap(
  notes: Note[],
  duration: number,
  windowSize: number = 5
): HeatMapZone[] {
  if (notes.length === 0) return [];
  
  const zones: HeatMapZone[] = [];
  const windowCount = Math.ceil(duration / windowSize);
  
  for (let i = 0; i < windowCount; i++) {
    const startTime = i * windowSize;
    const endTime = Math.min((i + 1) * windowSize, duration);
    
    const notesInWindow = notes.filter(
      n => n.time >= startTime && n.time < endTime
    );
    
    const density = notesInWindow.length / (endTime - startTime);
    
    let intensity: HeatMapZone['intensity'] = 'low';
    if (density >= 12) intensity = 'extreme';
    else if (density >= 8) intensity = 'high';
    else if (density >= 4) intensity = 'medium';
    
    if (notesInWindow.length > 0) {
      zones.push({
        id: `hz-${Date.now()}-${i}`,
        chartId: notes[0].chartId,
        startTime,
        endTime,
        density: Math.round(density * 10) / 10,
        intensity,
      });
    }
  }
  
  return zones;
}

export function calculateNoteDensity(
  notes: Note[],
  duration: number,
  windowSize: number = 1
): number[] {
  const density: number[] = [];
  const windows = Math.ceil(duration / windowSize);
  
  for (let i = 0; i < windows; i++) {
    const start = i * windowSize;
    const end = start + windowSize;
    const count = notes.filter(n => n.time >= start && n.time < end).length;
    density.push(count);
  }
  
  return density;
}

export function estimateDifficulty(chart: Chart): number {
  const { notes, bpm, trackCount } = chart;
  
  if (notes.length === 0) return 1;
  
  const sortedNotes = [...notes].sort((a, b) => a.time - b.time);
  const density = calculateNoteDensity(notes, sortedNotes[sortedNotes.length - 1].time, 2);
  
  const maxDensity = Math.max(...density);
  const avgDensity = density.reduce((a, b) => a + b, 0) / density.length;
  
  const holdCount = notes.filter(n => n.type === 'hold' || n.type === 'slide').length;
  const holdRatio = holdCount / notes.length;
  
  const patternScore = calculatePatternComplexity(notes, trackCount);
  
  const bpmFactor = Math.min(bpm / 120, 2);
  
  const difficulty = (
    avgDensity * 0.3 +
    maxDensity * 0.4 +
    holdRatio * 10 +
    patternScore * 0.3
  ) * bpmFactor;
  
  return Math.min(Math.max(Math.round(difficulty), 1), 20);
}

function calculatePatternComplexity(notes: Note[], trackCount: number): number {
  if (notes.length < 2) return 0;
  
  let crossCount = 0;
  let jumpCount = 0;
  
  for (let i = 1; i < notes.length; i++) {
    const prev = notes[i - 1];
    const curr = notes[i];
    
    if (curr.time - prev.time < 0.1) {
      if (Math.abs(curr.trackIndex - prev.trackIndex) === trackCount - 1) {
        crossCount++;
      }
      if (Math.abs(curr.trackIndex - prev.trackIndex) >= 2) {
        jumpCount++;
      }
    }
  }
  
  return (crossCount * 2 + jumpCount) / notes.length * 10;
}

export function adjustOffset(notes: Note[], offset: number): Note[] {
  return notes.map(note => ({
    ...note,
    time: Math.round((note.time + offset) * 1000) / 1000,
  }));
}

export function timeToMeasureBeat(
  time: number,
  grid: BeatGrid
): { measure: number; beat: number; fraction: number } {
  const [beatsPerMeasure] = grid.timeSignature;
  const totalBeats = getBeatAtTime(time, grid);
  const measure = Math.floor(totalBeats / beatsPerMeasure) + 1;
  const beat = Math.floor(totalBeats % beatsPerMeasure) + 1;
  const fraction = totalBeats - Math.floor(totalBeats);
  
  return { measure, beat, fraction };
}

export function measureBeatToTime(
  measure: number,
  beat: number,
  fraction: number,
  grid: BeatGrid
): number {
  const [beatsPerMeasure] = grid.timeSignature;
  const totalBeats = (measure - 1) * beatsPerMeasure + (beat - 1) + fraction;
  return grid.offset + (totalBeats * 60) / grid.bpm;
}
