'use client';

import { useState, useEffect, useRef } from 'react';
import { Affirmation, MusicSettings } from '@/types';
import { AudioMixer } from '@/services/audioMixer';
import { AudioSynchronizer } from '../utils/audioSync';
import { AudioCache } from '@/utils/cache';

interface Props {
  affirmation: Affirmation;
  musicSettings: MusicSettings;
  onSettingsChange: (settings: MusicSettings) => void;
  musicUrl?: string;
}

export default function AudioControls({ affirmation, musicSettings, onSettingsChange, musicUrl }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mixUrl, setMixUrl] = useState<string | null>(null);
  const mixerRef = useRef<AudioMixer | null>(null);
  const synchronizer = useRef<AudioSynchronizer | null>(null);

  useEffect(() => {
    mixerRef.current = new AudioMixer();
    synchronizer.current = new AudioSynchronizer();
    return () => {
      mixerRef.current?.stop();
      synchronizer.current?.stop();
    };
  }, []);

  const handleMusicGenerated = (url: string) => {
    setMusicUrl(url);
  };

  const loadAndPlay = async () => {
    if (!affirmation.audioUrl || !musicUrl || !mixerRef.current) return;
    
    try {
      setIsLoading(true);
      const mixBuffer = await mixerRef.current.createEpicMix(affirmation.audioUrl, musicUrl, musicSettings);
      
      const mixBlob = new Blob([mixBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(mixBlob);
      setMixUrl(url);
      
      mixerRef.current.play();
      setIsPlaying(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading audio:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (mixUrl) {
        URL.revokeObjectURL(mixUrl);
      }
    };
  }, [mixUrl]);

  const handleDownload = () => {
    if (!mixUrl) return;
    
    const link = document.createElement('a');
    link.href = mixUrl;
    link.download = 'manifest-mix.wav';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stop = () => {
    if (!mixerRef.current) return;
    mixerRef.current.stop();
    setIsPlaying(false);
  };

  const combineAudio = async (musicUrl: string, speechUrl: string) => {
    try {
      await synchronizer.current?.synchronizeAudio(musicUrl, speechUrl);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handleTTS = async () => {
    try {
      if (!affirmation.text) return;

      const cacheKey = AudioCache.getTTSKey(affirmation.text);
      const cachedUrl = await AudioCache.getTTSItem(cacheKey);
      
      if (cachedUrl) {
        console.log('Using cached TTS audio');
        setAffirmation(prev => ({ ...prev, audioUrl: cachedUrl }));
        return;
      }

      console.log('Generating new TTS audio');
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: affirmation.text })
      });

      if (!response.ok) {
        throw new Error('Failed to generate TTS');
      }

      const data = await response.json();
      
      // Cache the audio URL
      if (data.url) {
        AudioCache.setItem(cacheKey, data.url);
        setAffirmation(prev => ({ ...prev, audioUrl: data.url }));
      }
    } catch (error) {
      console.error('TTS generation error:', error);
    }
  };

  // Update the useEffect hook that checks for cached audio
  useEffect(() => {
    const checkCachedAudio = async () => {
      if (affirmation.text && !affirmation.audioUrl) {
        const cacheKey = AudioCache.getTTSKey(affirmation.text);
        const cachedUrl = await AudioCache.getTTSItem(cacheKey);
        if (cachedUrl) {
          console.log('Found cached TTS audio on mount');
          setAffirmation(prev => ({ ...prev, audioUrl: cachedUrl }));
        }
      }
    };

    checkCachedAudio();
  }, [affirmation.text]);

  return (
    <div className="space-y-6">
      {musicUrl && (
        <div className="flex items-center gap-4">
          <button
            onClick={isPlaying ? stop : loadAndPlay}
            disabled={!affirmation.audioUrl || isLoading}
            className={`px-4 py-2 rounded-lg ${
              isPlaying 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-purple-600 hover:bg-purple-700'
            } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                Loading...
              </>
            ) : (
              isPlaying ? 'Stop Mix' : 'Play Mix'
            )}
          </button>

          {mixUrl && (
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 flex items-center gap-2"
            >
              <span>💾</span>
              Download Mix
            </button>
          )}
        </div>
      )}
    </div>
  );
} 