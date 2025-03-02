'use client';

import { useState, useEffect, useRef } from 'react';
import { Affirmation } from '@/types';
import { AudioCache } from '@/utils/cache';

interface Props {
  onSelect: (affirmation: Affirmation) => void;
  currentAffirmation?: Affirmation | null;
}

export default function SavedAffirmations({ onSelect, currentAffirmation }: Props) {
  // State
  const [expanded, setExpanded] = useState(false);
  const [savedAffirmations, setSavedAffirmations] = useState<Affirmation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(false);

  // Initialize on mount
  useEffect(() => {
    setMounted(true);
    mountedRef.current = true;
    loadSavedAffirmations();
    setExpanded(true);

    const handleStorageChange = (e: Event) => {
      if (!mountedRef.current) return;
      
      if (e instanceof CustomEvent && e.detail?.affirmations) {
        setSavedAffirmations(e.detail.affirmations);
      } else {
        loadSavedAffirmations();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('custom-storage', handleStorageChange);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('custom-storage', handleStorageChange);
    };
  }, []);

  const loadSavedAffirmations = () => {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem('saved_affirmations');
      const parsed = saved ? JSON.parse(saved) : [];
      if (mountedRef.current) {
        setSavedAffirmations(parsed);
        setIsLoading(false);
      }
    } catch (e) {
      console.error('Failed to load saved affirmations:', e);
      if (mountedRef.current) {
        setSavedAffirmations([]);
        setIsLoading(false);
      }
    }
  };

  const handleDelete = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = savedAffirmations.filter((_, i) => i !== index);
      localStorage.setItem('saved_affirmations', JSON.stringify(updated));
      setSavedAffirmations(updated);
      window.dispatchEvent(new CustomEvent('custom-storage', {
        detail: { affirmations: updated }
      }));
    } catch (e) {
      console.error('Failed to delete affirmation:', e);
    }
  };

  const handlePlay = async (affirmation: Affirmation, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      if (playingIndex === index && audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setPlayingIndex(null);
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const cacheKey = AudioCache.getTTSKey(affirmation.text);
      const cachedAudioUrl = await AudioCache.getTTSItem(cacheKey);

      if (!cachedAudioUrl) {
        console.error('No cached audio found for:', affirmation.text);
        return;
      }

      const audio = new Audio(cachedAudioUrl);
      audioRef.current = audio;
      
      audio.addEventListener('ended', () => {
        if (mountedRef.current) {
          setPlayingIndex(null);
          audioRef.current = null;
        }
      });

      setPlayingIndex(index);
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingIndex(null);
    }
  };

  const formatDate = (timestamp: number) => {
    if (!mounted) return '';
    return new Date(timestamp).toLocaleDateString();
  };

  const handleSelect = (aff: Affirmation) => {
    onSelect({
      ...aff,
      timestamp: Date.now() // Update timestamp to avoid hydration issues
    });
  };

  // Don't render anything during SSR or loading
  if (!mounted || isLoading || savedAffirmations.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 bg-purple-950/30 rounded-xl p-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-lg font-semibold text-purple-200 flex items-center gap-2">
          <span>📚</span> Saved Affirmations
          <span className="text-sm text-purple-400">({savedAffirmations.length})</span>
        </h3>
        <span className="text-purple-400">
          {expanded ? '▼' : '▶'}
        </span>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {savedAffirmations.map((aff, index) => (
            <div 
              key={`${aff.text}_${index}`}
              className={`group bg-purple-900/30 rounded-lg p-3 flex items-start justify-between hover:bg-purple-900/40 transition-colors ${
                currentAffirmation?.text === aff.text ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              <div className="flex-1">
                <p className="text-purple-200">{aff.text}</p>
                {aff.timestamp && (
                  <p className="text-sm text-purple-400 mt-1">
                    {formatDate(aff.timestamp)}
                  </p>
                )}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handlePlay(aff, index, e)}
                  className="text-purple-400 hover:text-purple-300"
                  title={playingIndex === index ? "Stop" : "Play"}
                >
                  {playingIndex === index ? '⏸️' : '▶️'}
                </button>
                <button
                  onClick={(e) => handleDelete(index, e)}
                  className="text-purple-400 hover:text-red-400"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 