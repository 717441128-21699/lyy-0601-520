import { useEffect, useRef } from 'react';

interface WaveformProps {
  data: number[];
  color?: string;
  height?: number;
  showCursor?: boolean;
  cursorPosition?: number;
  onClick?: (time: number) => void;
  className?: string;
}

export function Waveform({
  data,
  color = '#00f0ff',
  height = 120,
  showCursor = false,
  cursorPosition = 0,
  onClick,
  className = '',
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, height);

    const barWidth = rect.width / data.length;
    const centerY = height / 2;

    data.forEach((value, i) => {
      const x = i * barWidth;
      const barHeight = value * (height - 20);
      
      const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, `${color}88`);
      gradient.addColorStop(1, color);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(
        x + 1,
        centerY - barHeight / 2,
        Math.max(1, barWidth - 2),
        barHeight
      );
    });

    if (showCursor) {
      const cursorX = cursorPosition * rect.width;
      ctx.strokeStyle = '#ff00aa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();
      
      ctx.shadowColor = '#ff00aa';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [data, color, height, showCursor, cursorPosition]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onClick) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const time = (e.clientX - rect.left) / rect.width;
    onClick(time);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className={`w-full ${className} ${onClick ? 'cursor-pointer' : ''}`}
      style={{ height }}
    />
  );
}
