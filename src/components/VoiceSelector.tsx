'use client';

import { useState, useEffect } from 'react';
import { TTSSettings } from '@/types';
import LoadingSpinner from './LoadingSpinner';

interface Voice {
  voice_id: string;
  name: string;
  preview_url?: string;
  category: string;
}

interface Props {
  settings: TTSSettings;
  onSettingsChange: (settings: TTSSettings) => void;
  disabled?: boolean;
}

export default function VoiceSelector({ settings, onSettingsChange, disabled }: Props) {
  const [mounted, setMounted] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchVoices();
    }
  }, [mounted]);

  const fetchVoices = async () => {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'Accept': 'application/json',
          'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY!,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }
      const data = await response.json();
      console.log('Available voices:', data.voices.map(v => ({ 
        id: v.voice_id, 
        name: v.name,
        category: v.category
      })));
      setVoices(data.voices);
    } catch (error) {
      console.error('Error fetching voices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const playPreview = (voice: Voice) => {
    if (!voice.preview_url) return;

    if (previewAudio) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
    }

    const audio = new Audio(voice.preview_url);
    setPreviewAudio(audio);
    setPlayingPreviewId(voice.voice_id);

    audio.onended = () => {
      setPlayingPreviewId(null);
    };

    audio.play();
  };

  const stopPreview = () => {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
    }
    setPlayingPreviewId(null);
  };

  if (!mounted) {
    return <LoadingSpinner />;
  }

  const selectedVoice = voices.find(v => v.voice_id === settings.voiceId);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Voice Settings</h3>
        
        <div className="flex gap-2 items-center">
          <select
            value={settings.voiceId}
            onChange={(e) => onSettingsChange({ ...settings, voiceId: e.target.value })}
            className="flex-1 p-2 rounded-lg bg-purple-800 bg-opacity-50 text-white"
            disabled={isLoading || disabled}
          >
            {isLoading ? (
              <option>Loading voices...</option>
            ) : (
              voices.map((voice) => (
                <option key={voice.voice_id} value={voice.voice_id}>
                  {voice.name}
                </option>
              ))
            )}
          </select>
          
          {selectedVoice?.preview_url && (
            <button
              onClick={() => playingPreviewId === selectedVoice.voice_id ? stopPreview() : playPreview(selectedVoice)}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-sm whitespace-nowrap"
              disabled={disabled}
            >
              {playingPreviewId === selectedVoice.voice_id ? 'Stop Preview' : 'Preview Voice'}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-2">Stability ({settings.stability})</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.stability}
            onChange={(e) => onSettingsChange({ ...settings, stability: parseFloat(e.target.value) })}
            className="w-full"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="block text-sm mb-2">Clarity ({settings.similarityBoost})</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.similarityBoost}
            onChange={(e) => onSettingsChange({ ...settings, similarityBoost: parseFloat(e.target.value) })}
            className="w-full"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
} 