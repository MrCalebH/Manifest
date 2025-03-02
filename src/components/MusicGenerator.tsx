'use client';

import { useState } from 'react';
import { MusicSettings, Affirmation } from '@/types';
import { Select } from '@/components/Select';
import Slider from '@/components/Slider';

interface Props {
  onMusicGenerated: (url: string) => void;
  settings: MusicSettings;
  onSettingsChange: (settings: MusicSettings) => void;
  selectedAffirmation: Affirmation;
}

export default function MusicGenerator({ 
  onMusicGenerated, 
  settings, 
  onSettingsChange,
  selectedAffirmation 
}: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMusic = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch('/api/replicate/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Create ${settings.mood} ${settings.style} music to accompany the affirmation: "${selectedAffirmation.text}"`,
          settings
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate music');
      }

      const data = await response.json();
      if (data.url) {
        onMusicGenerated(data.url);
      }
    } catch (error) {
      console.error('Error generating music:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate music');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-purple-950/30 rounded-xl">
      <h2 className="text-xl font-semibold text-purple-200">Background Music Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Select
          label="Style"
          value={settings.style}
          options={[
            { value: 'Ambient', label: '🎵 Ambient' },
            { value: 'Piano', label: '🎹 Piano' },
            { value: 'Orchestra', label: '🎻 Orchestra' },
            { value: 'Electronic', label: '🎛️ Electronic' },
            { value: 'Nature', label: '🌿 Nature' }
          ]}
          onChange={(value) => onSettingsChange({ ...settings, style: value })}
        />

        <Select
          label="Mood"
          value={settings.mood}
          options={[
            { value: 'Uplifting', label: '🌟 Uplifting' },
            { value: 'Peaceful', label: '🌊 Peaceful' },
            { value: 'Energetic', label: '⚡ Energetic' },
            { value: 'Dreamy', label: '🌙 Dreamy' },
            { value: 'Powerful', label: '💪 Powerful' }
          ]}
          onChange={(value) => onSettingsChange({ ...settings, mood: value })}
        />

        <Select
          label="Tempo"
          value={settings.tempo}
          options={[
            { value: 'Slow', label: '🐢 Slow' },
            { value: 'Medium', label: '🚶 Medium' },
            { value: 'Fast', label: '🏃 Fast' }
          ]}
          onChange={(value) => onSettingsChange({ ...settings, tempo: value })}
        />

        <Select
          label="Intensity"
          value={settings.intensity}
          options={[
            { value: 'Gentle', label: '🍃 Gentle' },
            { value: 'Balanced', label: '☯️ Balanced' },
            { value: 'Strong', label: '🔥 Strong' }
          ]}
          onChange={(value) => onSettingsChange({ ...settings, intensity: value })}
        />
      </div>

      <div className="space-y-4">
        <Slider
          label="Volume"
          value={settings.volume}
          onChange={(value) => onSettingsChange({ ...settings, volume: value })}
          min={0}
          max={1}
          step={0.1}
          icon="🔊"
        />
      </div>

      <button
        onClick={generateMusic}
        disabled={isGenerating}
        className="w-full px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <span className="animate-spin">⏳</span>
            Generating...
          </>
        ) : (
          <>🎵 Generate Music</>
        )}
      </button>

      {error && (
        <div className="text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
} 