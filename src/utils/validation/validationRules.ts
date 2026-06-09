import type { Chart, Note, ValidationIssue, ValidationRule, ValidationReport, JudgementWindow } from '../../types';
import { calculateNoteDensity, calculateHeatMap, estimateDifficulty } from '../beat/beatGrid';

const generateId = () => Math.random().toString(36).substring(2, 11);

export const judgementWindows: JudgementWindow = {
  perfect: 0.016,
  great: 0.040,
  good: 0.080,
  miss: 0.120,
};

export const validationRules: ValidationRule[] = [
  {
    id: 'overlap',
    name: '重叠音符检测',
    description: '检测同一轨道上时间过于接近的音符',
    severity: 'error',
    check: checkOverlappingNotes,
  },
  {
    id: 'too_dense',
    name: '过密段落检测',
    description: '检测音符密度过高的段落（超过人类极限）',
    severity: 'warning',
    check: checkDenseSections,
  },
  {
    id: 'misaligned',
    name: '音符对齐检测',
    description: '检测未对齐到节拍网格的音符',
    severity: 'warning',
    check: checkMisalignedNotes,
  },
  {
    id: 'timing_error',
    name: '时序错误检测',
    description: '检测Hold/Slide音符的持续时间错误',
    severity: 'error',
    check: checkTimingErrors,
  },
  {
    id: 'difficulty_spike',
    name: '难度突增检测',
    description: '检测难度曲线中的突然峰值',
    severity: 'warning',
    check: checkDifficultySpikes,
  },
  {
    id: 'empty_measure',
    name: '空小节检测',
    description: '检测音乐有节拍但没有音符的小节',
    severity: 'info',
    check: checkEmptyMeasures,
  },
  {
    id: 'missing_sound',
    name: '缺失音效检测',
    description: '检测没有设置音效的音符',
    severity: 'info',
    check: checkMissingSounds,
  },
];

function checkOverlappingNotes(chart: Chart): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const minInterval = 0.02;
  
  for (let track = 0; track < chart.trackCount; track++) {
    const trackNotes = chart.notes
      .filter(n => n.trackIndex === track)
      .sort((a, b) => a.time - b.time);
    
    for (let i = 1; i < trackNotes.length; i++) {
      const prev = trackNotes[i - 1];
      const curr = trackNotes[i];
      
      if (curr.time - prev.time < minInterval) {
        issues.push({
          id: generateId(),
          chartId: chart.id,
          type: 'overlap',
          severity: 'error',
          description: `检测到2个音符在轨道${track + 1}上重叠，时间差仅${Math.round((curr.time - prev.time) * 1000)}ms`,
          time: prev.time,
          trackIndex: track,
          noteIds: [prev.id, curr.id],
          isFixed: false,
          suggestion: '删除其中一个音符或调整时间位置，保持至少20ms间隔',
        });
      }
    }
  }
  
  return issues;
}

function checkDenseSections(chart: Chart): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const maxDensity = 12;
  const windowSize = 1;
  
  if (chart.notes.length === 0) return issues;
  
  const sortedNotes = [...chart.notes].sort((a, b) => a.time - b.time);
  const duration = sortedNotes[sortedNotes.length - 1].time;
  const density = calculateNoteDensity(chart.notes, duration, windowSize);
  
  for (let i = 0; i < density.length; i++) {
    if (density[i] > maxDensity) {
      issues.push({
        id: generateId(),
        chartId: chart.id,
        type: 'too_dense',
        severity: 'warning',
        description: `该段落音符密度过高（${density[i]} NPS），可能超出人类演奏极限`,
        time: i * windowSize,
        isFixed: false,
        suggestion: '考虑减少该区域音符数量，或降低难度评级',
      });
    }
  }
  
  return issues;
}

function checkMisalignedNotes(chart: Chart): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const beatInterval = 60 / chart.bpm;
  const snapDivisions = [4, 8, 16, 32];
  const maxDeviation = 0.015;
  
  for (const note of chart.notes) {
    const relativeTime = note.time - chart.offset;
    let isAligned = false;
    
    for (const division of snapDivisions) {
      const snapInterval = beatInterval / division;
      const snapped = Math.round(relativeTime / snapInterval) * snapInterval;
      if (Math.abs(relativeTime - snapped) <= maxDeviation) {
        isAligned = true;
        break;
      }
    }
    
    if (!isAligned) {
      const deviation = relativeTime - Math.round(relativeTime / (beatInterval / 32)) * (beatInterval / 32);
      issues.push({
        id: generateId(),
        chartId: chart.id,
        type: 'misaligned',
        severity: 'warning',
        description: `音符未对齐到节拍网格，偏差${Math.round(Math.abs(deviation) * 1000)}ms`,
        time: note.time,
        trackIndex: note.trackIndex,
        noteIds: [note.id],
        isFixed: false,
        suggestion: '使用自动对齐功能将音符吸附到最近的节拍位置',
      });
    }
  }
  
  return issues;
}

function checkTimingErrors(chart: Chart): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  for (const note of chart.notes) {
    if ((note.type === 'hold' || note.type === 'slide') && note.duration !== undefined) {
      if (note.duration <= 0) {
        issues.push({
          id: generateId(),
          chartId: chart.id,
          type: 'timing_error',
          severity: 'error',
          description: `${note.type === 'hold' ? 'Hold' : 'Slide'}音符持续时间无效（${note.duration.toFixed(3)}s）`,
          time: note.time,
          trackIndex: note.trackIndex,
          noteIds: [note.id],
          isFixed: false,
          suggestion: '调整持续时间为正值，建议至少0.1秒',
        });
      }
    }
  }
  
  return issues;
}

function checkDifficultySpikes(chart: Chart): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (chart.notes.length < 10) return issues;
  
  const sortedNotes = [...chart.notes].sort((a, b) => a.time - b.time);
  const duration = sortedNotes[sortedNotes.length - 1].time;
  const windowSize = 10;
  const windows = Math.ceil(duration / windowSize);
  
  const difficultyByWindow: number[] = [];
  
  for (let i = 0; i < windows; i++) {
    const windowNotes = chart.notes.filter(
      n => n.time >= i * windowSize && n.time < (i + 1) * windowSize
    );
    
    if (windowNotes.length > 0) {
      const windowDensity = windowNotes.length / windowSize;
      const holdRatio = windowNotes.filter(n => n.type === 'hold' || n.type === 'slide').length / windowNotes.length;
      difficultyByWindow.push(windowDensity * 0.8 + holdRatio * 5);
    } else {
      difficultyByWindow.push(0);
    }
  }
  
  const avgDifficulty = difficultyByWindow.reduce((a, b) => a + b, 0) / difficultyByWindow.length;
  const threshold = avgDifficulty * 2;
  
  for (let i = 0; i < difficultyByWindow.length; i++) {
    if (difficultyByWindow[i] > threshold && difficultyByWindow[i] - avgDifficulty > 5) {
      issues.push({
        id: generateId(),
        chartId: chart.id,
        type: 'difficulty_spike',
        severity: 'warning',
        description: `难度突增：该段落难度比平均值高${Math.round((difficultyByWindow[i] - avgDifficulty) / avgDifficulty * 100)}%`,
        time: i * windowSize,
        isFixed: false,
        suggestion: '考虑调整该区域的音符分布，使难度曲线更加平滑',
      });
    }
  }
  
  return issues;
}

function checkEmptyMeasures(chart: Chart): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const beatInterval = 60 / chart.bpm;
  const measureInterval = beatInterval * 4;
  
  if (chart.notes.length === 0) return issues;
  
  const sortedNotes = [...chart.notes].sort((a, b) => a.time - b.time);
  const duration = sortedNotes[sortedNotes.length - 1].time;
  const totalMeasures = Math.ceil(duration / measureInterval);
  
  for (let m = 0; m < totalMeasures; m++) {
    const measureStart = m * measureInterval + chart.offset;
    const measureEnd = measureStart + measureInterval;
    
    const notesInMeasure = chart.notes.filter(
      n => n.time >= measureStart && n.time < measureEnd
    );
    
    if (notesInMeasure.length === 0 && measureStart > 0) {
      issues.push({
        id: generateId(),
        chartId: chart.id,
        type: 'empty_measure',
        severity: 'info',
        description: `第${m + 1}小节没有音符`,
        time: measureStart,
        isFixed: false,
        suggestion: '如果音乐在该小节有明显节拍，考虑添加音符；如果是刻意留白则可忽略',
      });
    }
  }
  
  return issues;
}

function checkMissingSounds(chart: Chart): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  for (const note of chart.notes) {
    if (!note.hitSound || note.hitSound === 'none') {
      issues.push({
        id: generateId(),
        chartId: chart.id,
        type: 'missing_sound',
        severity: 'info',
        description: '音符未设置打击音效',
        time: note.time,
        trackIndex: note.trackIndex,
        noteIds: [note.id],
        isFixed: false,
        suggestion: '为音符设置合适的打击音效以增强游戏反馈',
      });
    }
  }
  
  return issues;
}

export function validateChart(chart: Chart): ValidationReport {
  const allIssues: ValidationIssue[] = [];
  
  for (const rule of validationRules) {
    try {
      const issues = rule.check(chart);
      allIssues.push(...issues.map(i => ({ ...i, severity: rule.severity })));
    } catch (e) {
      console.error(`校验规则 ${rule.id} 执行失败:`, e);
    }
  }
  
  const sortedNotes = [...chart.notes].sort((a, b) => a.time - b.time);
  const duration = sortedNotes.length > 0 ? sortedNotes[sortedNotes.length - 1].time : 0;
  const density = calculateNoteDensity(chart.notes, duration, 1);
  const heatZones = calculateHeatMap(chart.notes, duration);
  const estimatedDifficulty = estimateDifficulty(chart);
  
  const passedChecks = validationRules
    .filter(rule => !allIssues.some(i => i.type === rule.id))
    .map(rule => rule.name);
  
  const avgNPS = density.length > 0 
    ? density.reduce((a, b) => a + b, 0) / density.length 
    : 0;
  const maxNPS = density.length > 0 ? Math.max(...density) : 0;
  
  return {
    chartId: chart.id,
    totalIssues: allIssues.length,
    issues: allIssues.sort((a, b) => a.time - b.time),
    estimatedDifficulty,
    noteDensity: density,
    heatZones,
    passedChecks,
    averageNPS: Math.round(avgNPS * 10) / 10,
    maxNPS,
    totalNotes: chart.notes.length,
  };
}

export function fixIssue(chart: Chart, issue: ValidationIssue): { chart: Chart; fixed: boolean } {
  const notes = [...chart.notes];
  
  switch (issue.type) {
    case 'overlap':
      if (issue.noteIds && issue.noteIds.length >= 2) {
        const idx = notes.findIndex(n => n.id === issue.noteIds![1]);
        if (idx !== -1) {
          notes.splice(idx, 1);
          return { chart: { ...chart, notes }, fixed: true };
        }
      }
      break;
      
    case 'timing_error':
      if (issue.noteIds && issue.noteIds.length >= 1) {
        const idx = notes.findIndex(n => n.id === issue.noteIds![0]);
        if (idx !== -1 && (notes[idx].type === 'hold' || notes[idx].type === 'slide')) {
          notes[idx] = { ...notes[idx], duration: 0.2 };
          return { chart: { ...chart, notes }, fixed: true };
        }
      }
      break;
      
    case 'misaligned':
      if (issue.noteIds && issue.noteIds.length >= 1) {
        const idx = notes.findIndex(n => n.id === issue.noteIds![0]);
        if (idx !== -1) {
          const beatInterval = 60 / chart.bpm;
          const snapInterval = beatInterval / 32;
          const relativeTime = notes[idx].time - chart.offset;
          const snapped = Math.round(relativeTime / snapInterval) * snapInterval + chart.offset;
          notes[idx] = { ...notes[idx], time: Math.round(snapped * 1000) / 1000 };
          return { chart: { ...chart, notes }, fixed: true };
        }
      }
      break;
      
    case 'missing_sound':
      if (issue.noteIds && issue.noteIds.length >= 1) {
        const idx = notes.findIndex(n => n.id === issue.noteIds![0]);
        if (idx !== -1) {
          notes[idx] = { ...notes[idx], hitSound: 'normal' };
          return { chart: { ...chart, notes }, fixed: true };
        }
      }
      break;
  }
  
  return { chart, fixed: false };
}

export function autoFixAllIssues(chart: Chart): { chart: Chart; fixedCount: number; failedCount: number } {
  let result = { ...chart };
  let fixedCount = 0;
  let failedCount = 0;
  
  const report = validateChart(result);
  
  for (const issue of report.issues) {
    if (!issue.isFixed) {
      const fixResult = fixIssue(result, issue);
      if (fixResult.fixed) {
        result = fixResult.chart;
        fixedCount++;
      } else {
        failedCount++;
      }
    }
  }
  
  return { chart: result, fixedCount, failedCount };
}

export function autoFixIssue(chart: Chart, issue: ValidationIssue): { chart: Chart; fixed: boolean } {
  return fixIssue(chart, issue);
}
