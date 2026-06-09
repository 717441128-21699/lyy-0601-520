import type { BPMResult } from '../../types';

export async function detectBPM(audioBuffer: AudioBuffer): Promise<BPMResult> {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  const beats = await detectBeats(channelData, sampleRate);
  const { bpm, intervals, confidence } = calculateBPMFromBeats(beats, sampleRate);
  
  return {
    bpm,
    confidence,
    beats,
    intervals,
    offset: beats.length > 0 ? beats[0] : 0,
  };
}

async function detectBeats(channelData: Float32Array, sampleRate: number): Promise<number[]> {
  const windowSize = Math.floor(sampleRate * 0.05);
  const hopSize = Math.floor(windowSize / 2);
  const energy: number[] = [];
  
  for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += Math.abs(channelData[i + j]);
    }
    energy.push(sum / windowSize);
  }
  
  const threshold = calculateThreshold(energy);
  const beats: number[] = [];
  const minBeatInterval = sampleRate * 0.2;
  
  let lastBeat = -minBeatInterval;
  for (let i = 1; i < energy.length - 1; i++) {
    if (energy[i] > threshold && 
        energy[i] > energy[i - 1] && 
        energy[i] > energy[i + 1] &&
        i * hopSize - lastBeat > minBeatInterval) {
      beats.push((i * hopSize) / sampleRate);
      lastBeat = i * hopSize;
    }
  }
  
  return beats;
}

function calculateThreshold(energy: number[]): number {
  const sorted = [...energy].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const mean = energy.reduce((a, b) => a + b, 0) / energy.length;
  return Math.max(median * 1.5, mean * 1.2);
}

function calculateBPMFromBeats(beats: number[], _sampleRate: number): {
  bpm: number;
  intervals: number[];
  confidence: number;
} {
  if (beats.length < 4) {
    return { bpm: 120, intervals: [], confidence: 0 };
  }
  
  const intervals: number[] = [];
  for (let i = 1; i < beats.length; i++) {
    intervals.push(beats[i] - beats[i - 1]);
  }
  
  const bpmCandidates: number[] = intervals.map(interval => 60 / interval);
  
  const histogram: Record<number, number> = {};
  bpmCandidates.forEach(bpm => {
    const rounded = Math.round(bpm);
    histogram[rounded] = (histogram[rounded] || 0) + 1;
  });
  
  let maxCount = 0;
  let bestBPM = 120;
  Object.entries(histogram).forEach(([bpm, count]) => {
    if (count > maxCount && parseInt(bpm) >= 60 && parseInt(bpm) <= 300) {
      maxCount = count;
      bestBPM = parseInt(bpm);
    }
  });
  
  const closeToBest = bpmCandidates.filter(bpm => 
    Math.abs(bpm - bestBPM) < bestBPM * 0.1
  );
  
  const averageBPM = closeToBest.length > 0
    ? closeToBest.reduce((a, b) => a + b, 0) / closeToBest.length
    : bestBPM;
  
  const confidence = closeToBest.length / bpmCandidates.length;
  
  const validIntervals = intervals.filter(interval => {
    const bpm = 60 / interval;
    return Math.abs(bpm - averageBPM) < averageBPM * 0.15;
  });
  
  return {
    bpm: Math.round(averageBPM * 100) / 100,
    intervals: validIntervals,
    confidence: Math.min(confidence, 1),
  };
}

export function generateWaveform(audioBuffer: AudioBuffer, samples: number = 500): number[] {
  const channelData = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / samples);
  const waveform: number[] = [];
  
  for (let i = 0; i < samples; i++) {
    const start = i * blockSize;
    let max = 0;
    for (let j = 0; j < blockSize; j++) {
      const abs = Math.abs(channelData[start + j] || 0);
      if (abs > max) max = abs;
    }
    waveform.push(max);
  }
  
  const maxVal = Math.max(...waveform);
  return waveform.map(v => v / maxVal);
}

export async function getAudioMetadata(file: File): Promise<{
  duration: number;
  sampleRate: number;
  bitRate?: number;
}> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    audio.onloadedmetadata = () => {
      resolve({
        duration: audio.duration,
        sampleRate: 44100,
      });
      URL.revokeObjectURL(url);
    };
    
    audio.onerror = () => {
      reject(new Error('无法读取音频文件'));
      URL.revokeObjectURL(url);
    };
    
    audio.src = url;
  });
}

export function estimateBitRate(file: File, duration: number): number {
  return Math.round((file.size * 8) / (duration * 1000));
}
