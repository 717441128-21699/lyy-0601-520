import type { Chart, Song, Note, ExportOptions, ExportFormat, VersionDiff } from '../../types';
import { sanitizeFilename, formatTime } from '../formatters';
import JSZip from 'jszip';

export function exportToJSON(chart: Chart, song?: Song): string {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    song: song ? {
      title: song.title,
      artist: song.artist,
      bpm: song.bpm,
      duration: song.duration,
      timeSignature: song.timeSignature,
    } : undefined,
    chart: {
      id: chart.id,
      name: chart.name,
      difficulty: chart.difficulty,
      difficultyLevel: chart.difficultyLevel,
      bpm: chart.bpm,
      trackCount: chart.trackCount,
      offset: chart.offset,
      tracks: chart.tracks.map(t => ({
        index: t.index,
        name: t.name,
        color: t.color,
        keyBind: t.keyBind,
      })),
      notes: chart.notes.map(n => ({
        track: n.trackIndex,
        time: n.time,
        type: n.type,
        duration: n.duration,
        hitSound: n.hitSound,
      })),
    },
  };
  
  return JSON.stringify(data, null, 2);
}

export function exportToOSU(chart: Chart, song: Song): string {
  const lines: string[] = [];
  
  lines.push('osu file format v14');
  lines.push('');
  lines.push('[General]');
  lines.push(`AudioFilename: ${song.audioFile?.name || 'audio.mp3'}`);
  lines.push(`AudioLeadIn: 0`);
  lines.push(`PreviewTime: ${Math.floor(song.duration / 2 * 1000)}`);
  lines.push(`Countdown: 0`);
  lines.push(`SampleSet: Normal`);
  lines.push(`StackLeniency: 0.7`);
  lines.push(`Mode: 3`);
  lines.push(`LetterboxInBreaks: 0`);
  lines.push(`SpecialStyle: 0`);
  lines.push(`WidescreenStoryboard: 1`);
  lines.push('');
  
  lines.push('[Editor]');
  lines.push(`DistanceSpacing: 1`);
  lines.push(`BeatDivisor: 4`);
  lines.push(`GridSize: 4`);
  lines.push(`TimelineZoom: 1`);
  lines.push('');
  
  lines.push('[Metadata]');
  lines.push(`Title:${song.title}`);
  lines.push(`TitleUnicode:${song.title}`);
  lines.push(`Artist:${song.artist}`);
  lines.push(`ArtistUnicode:${song.artist}`);
  lines.push(`Creator:Rhythm Chart Tool`);
  lines.push(`Version:${chart.difficulty.toUpperCase()}`);
  lines.push(`Source:`);
  lines.push(`Tags:`);
  lines.push(`BeatmapID:0`);
  lines.push(`BeatmapSetID:0`);
  lines.push('');
  
  lines.push('[Difficulty]');
  const hp = Math.max(20 - chart.difficultyLevel, 5);
  const od = Math.min(chart.difficultyLevel + 5, 10);
  const cs = Math.min(4 + chart.difficultyLevel / 5, 7);
  lines.push(`HPDrainRate:${hp}`);
  lines.push(`CircleSize:${cs.toFixed(1)}`);
  lines.push(`OverallDifficulty:${od}`);
  lines.push(`ApproachRate:${Math.min(od, 10)}`);
  lines.push(`SliderMultiplier:1.4`);
  lines.push(`SliderTickRate:1`);
  lines.push('');
  
  lines.push('[Events]');
  lines.push('//Background and Video events');
  lines.push('//Break Periods');
  lines.push('//Storyboard Layer 0 (Background)');
  lines.push('//Storyboard Layer 1 (Fail)');
  lines.push('//Storyboard Layer 2 (Pass)');
  lines.push('//Storyboard Layer 3 (Foreground)');
  lines.push('//Storyboard Sound Samples');
  lines.push('');
  
  lines.push('[TimingPoints]');
  const beatLength = 60000 / chart.bpm;
  lines.push(`${chart.offset * 1000},${beatLength},4,1,0,100,1,0`);
  lines.push('');
  
  lines.push('[Colours]');
  chart.tracks.forEach((track, i) => {
    const rgb = hexToRgb(track.color);
    lines.push(`Combo${i + 1} : ${rgb.r}, ${rgb.g}, ${rgb.b}`);
  });
  lines.push('');
  
  lines.push('[HitObjects]');
  const sortedNotes = [...chart.notes].sort((a, b) => a.time - b.time);
  
  for (const note of sortedNotes) {
    const x = 50 + note.trackIndex * 130;
    const y = 192;
    const time = Math.floor((note.time + chart.offset) * 1000);
    
    if (note.type === 'tap') {
      lines.push(`${x},${y},${time},1,0,0:0:0:0:`);
    } else if (note.type === 'hold' && note.duration) {
      const endTime = Math.floor((note.time + note.duration + chart.offset) * 1000);
      lines.push(`${x},${y},${time},128,0,${endTime}:0:0:0:0:`);
    } else if (note.type === 'slide') {
      const endTime = Math.floor((note.time + (note.duration || 0.5) + chart.offset) * 1000);
      const endX = 50 + ((note.trackIndex + 1) % chart.trackCount) * 130;
      lines.push(`${x},${y},${time},2,0,L|${endX}:${y},1,${endTime - time}`);
    }
  }
  
  return lines.join('\n');
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 255, b: 255 };
}

export function exportToBMS(chart: Chart, song: Song): string {
  const lines: string[] = [];
  
  lines.push('#PLAYER 1');
  lines.push('#GENRE RHYTHM');
  lines.push(`#TITLE ${song.title}`);
  lines.push(`#ARTIST ${song.artist}`);
  lines.push(`#BPM ${chart.bpm}`);
  lines.push(`#PLAYLEVEL ${chart.difficultyLevel}`);
  lines.push('#RANK 2');
  lines.push('#TOTAL 100');
  lines.push(`#LNTYPE 1`);
  lines.push('');
  
  lines.push('#WAV01 normal.wav');
  lines.push('#WAV02 hold.wav');
  lines.push('');
  
  const beatInterval = 60 / chart.bpm;
  const measures = Math.ceil(song.duration / (beatInterval * 4));
  
  for (let m = 0; m < measures; m++) {
    const measureStart = m * beatInterval * 4;
    const measureEnd = measureStart + beatInterval * 4;
    
    const measureNotes = chart.notes.filter(
      n => n.time >= measureStart && n.time < measureEnd
    );
    
    if (measureNotes.length > 0) {
      for (const note of measureNotes) {
        const positionInMeasure = (note.time - measureStart) / (beatInterval * 4);
        const channel = note.trackIndex + 16;
        const slot = Math.floor(positionInMeasure * 192);
        const slotHex = slot.toString(16).padStart(2, '0').toUpperCase();
        const wav = note.type === 'hold' ? '02' : '01';
        
        if (note.type === 'hold' && note.duration) {
          const endPosition = (note.time + note.duration - measureStart) / (beatInterval * 4);
          const endSlot = Math.floor(endPosition * 192);
          const endSlotHex = endSlot.toString(16).padStart(2, '0').toUpperCase();
          
          lines.push(`#${m.toString().padStart(3, '0')}${channel}:${slotHex}${wav}`);
          lines.push(`#${m.toString().padStart(3, '0')}${channel + 1}:${endSlotHex}00`);
        } else {
          lines.push(`#${m.toString().padStart(3, '0')}${channel}:${slotHex}${wav}`);
        }
      }
    }
  }
  
  return lines.join('\n');
}

export function exportToCustom(chart: Chart, song?: Song): string {
  const data = {
    format: 'RHYTHM_CHART_TOOL',
    version: '1.0',
    song: song ? {
      id: song.id,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      bpm: song.bpm,
      sampleRate: song.sampleRate,
      offset: song.offset,
    } : undefined,
    chart: {
      id: chart.id,
      name: chart.name,
      difficulty: chart.difficulty,
      difficultyLevel: chart.difficultyLevel,
      bpm: chart.bpm,
      trackCount: chart.trackCount,
      offset: chart.offset,
      createdAt: chart.createdAt,
      updatedAt: chart.updatedAt,
    },
    tracks: chart.tracks.map(t => ({
      id: t.id,
      index: t.index,
      name: t.name,
      color: t.color,
      keyBind: t.keyBind,
    })),
    notes: chart.notes.map(n => ({
      id: n.id,
      trackIndex: n.trackIndex,
      time: n.time,
      type: n.type,
      duration: n.duration,
      hitSound: n.hitSound,
    })),
    timingMarkers: chart.timingMarkers.map(t => ({
      id: t.id,
      time: t.time,
      type: t.type,
      label: t.label,
      bpm: t.bpm,
    })),
  };
  
  return JSON.stringify(data, null, 2);
}

export async function exportChart(
  chart: Chart,
  song: Song | undefined,
  options: ExportOptions
): Promise<Blob> {
  let content: string;
  let mimeType: string;
  let filename: string;
  
  const baseName = sanitizeFilename(`${song?.title || 'chart'}_${chart.difficulty}`);
  
  switch (options.format) {
    case 'json':
      content = exportToJSON(chart, song);
      mimeType = 'application/json';
      filename = `${baseName}.json`;
      break;
    case 'osu':
      if (!song) throw new Error('导出OSU格式需要歌曲信息');
      content = exportToOSU(chart, song);
      mimeType = 'text/plain';
      filename = `${baseName}.osu`;
      break;
    case 'bms':
      if (!song) throw new Error('导出BMS格式需要歌曲信息');
      content = exportToBMS(chart, song);
      mimeType = 'text/plain';
      filename = `${baseName}.bms`;
      break;
    case 'chart':
      content = exportToCustom(chart, song);
      mimeType = 'application/json';
      filename = `${baseName}.chart`;
      break;
    default:
      content = exportToCustom(chart, song);
      mimeType = 'application/json';
      filename = `${baseName}.chart`;
  }
  
  return new Blob([content], { type: mimeType });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function compareVersions(chartA: Chart, chartB: Chart): VersionDiff {
  const addedNotes: Note[] = [];
  const removedNotes: Note[] = [];
  const modifiedNotes: Array<{ old: Note; new: Note }> = [];
  const timingChanges: Array<{ old: number; new: number }> = [];
  const bpmChanges: Array<{ old: number; new: number }> = [];
  
  const notesA = new Map(chartA.notes.map(n => [n.id, n]));
  const notesB = new Map(chartB.notes.map(n => [n.id, n]));
  
  for (const [id, noteB] of notesB) {
    if (!notesA.has(id)) {
      addedNotes.push(noteB);
    } else {
      const noteA = notesA.get(id)!;
      if (JSON.stringify(noteA) !== JSON.stringify(noteB)) {
        modifiedNotes.push({ old: noteA, new: noteB });
        if (noteA.time !== noteB.time) {
          timingChanges.push({ old: noteA.time, new: noteB.time });
        }
      }
    }
  }
  
  for (const [id, noteA] of notesA) {
    if (!notesB.has(id)) {
      removedNotes.push(noteA);
    }
  }
  
  if (chartA.bpm !== chartB.bpm) {
    bpmChanges.push({ old: chartA.bpm, new: chartB.bpm });
  }
  
  if (chartA.offset !== chartB.offset) {
    timingChanges.push({ old: chartA.offset, new: chartB.offset });
  }
  
  const totalNotes = Math.max(chartA.notes.length, chartB.notes.length);
  const changedNotes = addedNotes.length + removedNotes.length + modifiedNotes.length;
  const similarity = totalNotes > 0 ? Math.max(0, 100 - (changedNotes / totalNotes) * 100) : 100;
  const difficultyDiff = chartB.difficultyLevel - chartA.difficultyLevel;
  
  const changes: Array<{ type: string; description: string; time?: number }> = [];
  addedNotes.forEach(n => changes.push({ type: 'add', description: `添加音符 @ ${formatTime(n.time)}`, time: n.time }));
  removedNotes.forEach(n => changes.push({ type: 'remove', description: `移除音符 @ ${formatTime(n.time)}`, time: n.time }));
  modifiedNotes.forEach(m => changes.push({ type: 'modify', description: `修改音符 @ ${formatTime(m.old.time)}`, time: m.old.time }));
  
  return {
    chartId: chartA.id,
    versionA: 'A',
    versionB: 'B',
    addedNotes,
    removedNotes,
    modifiedNotes,
    timingChanges,
    bpmChanges,
    difficultyDiff,
    similarity,
    changes,
  };
}

export function generateExportFilename(
  songTitle: string,
  difficulty: string,
  format: ExportFormat
): string {
  const extMap: Record<ExportFormat, string> = {
    json: 'json',
    osu: 'osu',
    bms: 'bms',
    chart: 'chart',
    zip: 'zip',
  };
  return `${sanitizeFilename(songTitle)}_${difficulty}.${extMap[format]}`;
}

export async function batchExportCharts(
  charts: Array<{ chart: Chart; song?: Song }>,
  options: ExportOptions,
  onProgress?: (current: number, total: number) => void
): Promise<{ blob: Blob; filename: string }[]> {
  const results: { blob: Blob; filename: string }[] = [];
  
  for (let i = 0; i < charts.length; i++) {
    const { chart, song } = charts[i];
    const blob = await exportChart(chart, song, options);
    const baseName = sanitizeFilename(`${song?.title || 'chart'}_${chart.difficulty}`);
    const extMap: Record<ExportFormat, string> = {
      json: 'json',
      osu: 'osu',
      bms: 'bms',
      chart: 'chart',
      zip: 'zip',
    };
    const filename = `${baseName}.${extMap[options.format]}`;
    
    results.push({ blob, filename });
    
    if (onProgress) {
      onProgress(i + 1, charts.length);
    }
    
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  return results;
}

export async function createLevelPack(
  charts: Array<{ chart: Chart; song?: Song }>,
  options: ExportOptions,
  packName: string,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(sanitizeFilename(packName))!;
  
  const files = await batchExportCharts(charts, options, onProgress);
  
  files.forEach(({ blob, filename }) => {
    folder.file(filename, blob);
  });
  
  const manifest = {
    name: packName,
    format: options.format,
    chartCount: charts.length,
    createdAt: new Date().toISOString(),
    charts: charts.map(({ chart, song }) => ({
      id: chart.id,
      name: chart.name,
      song: song?.title,
      difficulty: chart.difficulty,
      difficultyLevel: chart.difficultyLevel,
      bpm: chart.bpm,
      noteCount: chart.notes.length,
    })),
  };
  
  folder.file('manifest.json', JSON.stringify(manifest, null, 2));
  
  return zip.generateAsync({ type: 'blob' });
}

export async function downloadBatchExport(
  charts: Array<{ chart: Chart; song?: Song }>,
  options: ExportOptions,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (charts.length === 0) {
    throw new Error('没有选择要导出的谱面');
  }
  
  if (charts.length === 1) {
    const { chart, song } = charts[0];
    const blob = await exportChart(chart, song, options);
    const baseName = sanitizeFilename(`${song?.title || 'chart'}_${chart.difficulty}`);
    const extMap: Record<ExportFormat, string> = {
      json: 'json',
      osu: 'osu',
      bms: 'bms',
      chart: 'chart',
      zip: 'zip',
    };
    const filename = `${baseName}.${extMap[options.format]}`;
    downloadBlob(blob, filename);
  } else {
    const projectName = charts[0]?.song?.title || 'LevelPack';
    const packName = `${projectName}_${charts.length}charts`;
    const zipBlob = await createLevelPack(charts, options, packName, onProgress);
    downloadBlob(zipBlob, `${sanitizeFilename(packName)}.zip`);
  }
}
