import { motion } from 'framer-motion';
import type { Note } from '../../types';

interface NoteBlockProps {
  note: Note;
  pixelPerSecond: number;
  trackWidth: number;
  isSelected?: boolean;
  onSelect?: (noteId: string, multiSelect?: boolean) => void;
  onDrag?: (noteId: string, timeOffset: number, trackOffset: number) => void;
}

const noteTypeStyles: Record<string, { bg: string; border: string; label: string }> = {
  tap: { bg: 'note-tap', border: 'border-cyan-400', label: 'T' },
  hold: { bg: 'note-hold', border: 'border-green-400', label: 'H' },
  slide: { bg: 'note-slide', border: 'border-pink-400', label: 'S' },
  swing: { bg: 'note-swing', border: 'border-yellow-400', label: 'W' },
};

export function NoteBlock({ note, pixelPerSecond, trackWidth, isSelected, onSelect, onDrag }: NoteBlockProps) {
  const style = noteTypeStyles[note.type];
  const left = note.time * pixelPerSecond;
  const width = note.duration ? note.duration * pixelPerSecond : trackWidth * 0.8;
  const height = note.type === 'hold' || note.type === 'slide' ? 20 : 32;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(note.id, e.shiftKey || e.ctrlKey);
  };

  const handleDragStart = (e: any) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('noteId', note.id);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: isSelected ? 1.05 : 1, 
        opacity: 1,
        boxShadow: isSelected ? '0 0 20px rgba(0, 240, 255, 0.8)' : 'none'
      }}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      className={`absolute cursor-pointer rounded-lg ${style.bg} border ${style.border} flex items-center justify-center text-xs font-bold text-white transition-transform ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-dark z-10' : ''}`}
      style={{
        left: `calc(${left}px + 4px)`,
        width: `calc(${width}px - 8px)`,
        height,
        top: '50%',
        transform: 'translateY(-50%)',
      }}
    >
      <span className="drop-shadow-lg">{style.label}</span>
      
      {note.hitSound && note.hitSound !== 'normal' && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-neon-yellow rounded-full text-[8px] flex items-center justify-center text-black font-bold">
          ♪
        </span>
      )}
    </motion.div>
  );
}
