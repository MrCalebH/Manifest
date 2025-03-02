'use client';

import { useState } from 'react';
import { MusicSettings } from '@/types';

interface Props {
  settings: MusicSettings;
  onSettingsChange: (settings: MusicSettings) => void;
}

export default function MusicPromptInput({ settings, onSettingsChange }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const presetStyles = [
    { label: "Epic Cinematic", prompt: "Create an epic orchestral track with dramatic builds and emotional peaks" },
    { label: "Meditation", prompt: "Peaceful ambient soundscape with gentle flowing elements" },
    { label: "Motivational", prompt: "Uplifting electronic track with inspiring progression" },
    { label: "Lo-fi Focus", prompt: "Calm lo-fi beats with subtle melodic elements" },
  ];

  const handlePromptChange = (prompt: string) => {
    onSettingsChange({
      ...settings,
      prompt
    });
  };

  const handlePresetClick = (preset: typeof presetStyles[0]) => {
    onSettingsChange({
      ...settings,
      style: preset.label.toLowerCase().includes('cinematic') ? 'cinematic' : 
             preset.label.toLowerCase().includes('lo-fi') ? 'lofi' : 
             preset.label.toLowerCase().includes('meditation') ? 'ambient' : 'electronic',
      mood: preset.label.toLowerCase().includes('epic') ? 'epic' :
            preset.label.toLowerCase().includes('meditation') ? 'peaceful' :
            preset.label.toLowerCase().includes('motivational') ? 'uplifting' : 'energetic',
      prompt: preset.prompt
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Music Style</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-purple-300 hover:text-purple-100"
        >
          {isExpanded ? 'Simple View' : 'Customize'}
        </button>
      </div>

      {!isExpanded ? (
        <div className="grid grid-cols-2 gap-2">
          {presetStyles.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePresetClick(preset)}
              className={`p-2 rounded-lg text-sm ${
                settings.prompt === preset.prompt
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-900 hover:bg-purple-800'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Custom Prompt</label>
            <textarea
              value={settings.prompt || ''}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder="Describe the music style you want..."
              className="w-full p-2 rounded bg-purple-900 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm mb-1">Style</label>
            <select
              value={settings.style}
              onChange={(e) => onSettingsChange({
                ...settings,
                style: e.target.value as MusicSettings['style']
              })}
              className="w-full p-2 rounded bg-purple-900 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="cinematic">Cinematic</option>
              <option value="electronic">Electronic</option>
              <option value="orchestral">Orchestral</option>
              <option value="ambient">Ambient</option>
              <option value="lofi">Lo-fi</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Mood</label>
            <select
              value={settings.mood || 'epic'}
              onChange={(e) => onSettingsChange({
                ...settings,
                mood: e.target.value as MusicSettings['mood']
              })}
              className="w-full p-2 rounded bg-purple-900 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="epic">Epic</option>
              <option value="uplifting">Uplifting</option>
              <option value="dramatic">Dramatic</option>
              <option value="peaceful">Peaceful</option>
              <option value="energetic">Energetic</option>
              <option value="meditative">Meditative</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
} 