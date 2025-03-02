'use client';

import { MusicSettings } from '@/types';

interface Props {
  settings: MusicSettings;
  onSettingsChange: (settings: MusicSettings) => void;
}

// This component can be removed since we've moved all its functionality to MusicGenerator
export default function MusicSettings({ settings, onSettingsChange }: Props) {
  return null; // Or we can remove this component entirely
} 