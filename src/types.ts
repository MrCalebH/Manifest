export interface MusicSettings {
  mood: 'Uplifting' | 'Peaceful' | 'Energetic' | 'Dreamy' | 'Powerful';
  style: 'Ambient' | 'Piano' | 'Orchestra' | 'Electronic' | 'Nature';
  tempo: 'Slow' | 'Medium' | 'Fast';
  intensity: 'Gentle' | 'Balanced' | 'Strong';
  volume: number; // 0-1
  duration: number;
  customPrompt?: string;
} 