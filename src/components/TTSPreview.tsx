'use client';

import { useState, useRef, useEffect } from 'react';
import { Affirmation } from '@/types';

interface Props {
  affirmation: Affirmation;
  onSave: (affirmation: Affirmation) => void;
  onDiscard: () => void;
}

export default function TTSPreview({ affirmation, onSave, onDiscard }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = async () => {
    if (!affirmation.audioUrl) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
      return;
    }

    try {
      const audio = new Audio(affirmation.audioUrl);
      audioRef.current = audio;

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        audioRef.current = null;
      });

      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-purple-900/30 rounded-lg">
      <h3 className="text-lg font-semibold text-purple-200 mb-3">Preview Generated Audio</h3>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlay}
            className="px-3 py-1 rounded bg-purple-700 hover:bg-purple-600 text-white flex items-center gap-2"
          >
            <span>{isPlaying ? '⏸️' : '▶️'}</span>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <p className="text-sm text-purple-300">
            Using voice: {affirmation.ttsSettings?.voiceId}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSave(affirmation)}
            className="px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-white flex items-center gap-2"
          >
            <span>💾</span> Save
          </button>
          <button
            onClick={onDiscard}
            className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white flex items-center gap-2"
          >
            <span>🗑️</span> Discard
          </button>
        </div>
      </div>
    </div>
  );
} 