export const formatTime = (seconds: number, includeMs: boolean = true): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  if (includeMs) {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const formatBPM = (bpm: number): string => {
  return bpm.toFixed(2);
};

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatDateShort = (date: Date): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export const parseTime = (timeStr: string): number => {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const [mins, secsMs] = parts;
    const [secs, ms] = secsMs.split('.');
    return parseInt(mins) * 60 + parseInt(secs) + (ms ? parseInt(ms) / 1000 : 0);
  }
  return 0;
};

export const beatToTime = (beat: number, bpm: number, offset: number = 0): number => {
  return (beat * 60) / bpm + offset;
};

export const timeToBeat = (time: number, bpm: number, offset: number = 0): number => {
  return ((time - offset) * bpm) / 60;
};

export const getDifficultyColor = (level: number): string => {
  if (level <= 5) return '#00ff88';
  if (level <= 10) return '#00f0ff';
  if (level <= 15) return '#ffcc00';
  if (level <= 20) return '#ff6600';
  return '#ff3366';
};

export const getDifficultyLabel = (difficulty: string): string => {
  const labels: Record<string, string> = {
    easy: '简单',
    normal: '普通',
    hard: '困难',
    expert: '专家',
    master: '大师',
  };
  return labels[difficulty] || difficulty;
};

export const getSeverityColor = (severity: string): string => {
  const colors: Record<string, string> = {
    error: '#ff3366',
    warning: '#ffcc00',
    info: '#00f0ff',
  };
  return colors[severity] || '#888';
};

export const getNoteTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    tap: 'linear-gradient(135deg, #00f0ff, #0088ff)',
    hold: 'linear-gradient(135deg, #00ff88, #00cc66)',
    slide: 'linear-gradient(135deg, #ff00aa, #cc0088)',
    swing: 'linear-gradient(135deg, #ffcc00, #ff9900)',
  };
  return colors[type] || colors.tap;
};

export const getIntensityColor = (intensity: string): string => {
  const colors: Record<string, string> = {
    low: 'rgba(0, 255, 136, 0.3)',
    medium: 'rgba(255, 204, 0, 0.5)',
    high: 'rgba(255, 102, 0, 0.7)',
    extreme: 'rgba(255, 51, 102, 0.9)',
  };
  return colors[intensity] || colors.low;
};

export const sanitizeFilename = (name: string): string => {
  return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
};

export const sanitizeFileName = sanitizeFilename;

export const generateChartName = (songTitle: string, difficulty: string): string => {
  return `${sanitizeFilename(songTitle)}_${difficulty}`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
