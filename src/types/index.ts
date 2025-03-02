export interface Affirmation {
  text: string;
  audioUrl?: string;
  timestamp: number;
  ttsSettings?: TTSSettings;
}

export interface MusicSettings {
  style: 'Ambient' | 'Piano' | 'Orchestra' | 'Electronic' | 'Nature';
  volume: number;
  tempo: 'Slow' | 'Medium' | 'Fast';
  mood: 'Uplifting' | 'Peaceful' | 'Energetic' | 'Dreamy' | 'Powerful';
  intensity: 'Gentle' | 'Balanced' | 'Strong';
  duration: number; // in seconds
}

export interface AudioRecorder {
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
  stream: MediaStream | null;
}

export interface AudioPlayer {
  audioContext: AudioContext | null;
  source: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
}

export interface TTSSettings {
  voiceId: string;
  stability: number;
  similarityBoost: number;
  modelId: string;
}

export interface AudioTrack {
  type: 'voice' | 'music';
  buffer: AudioBuffer;
  settings?: {
    volume?: number;
    tempo?: number;
  };
}

export interface MixSettings {
  voiceVolume: number;
  musicVolume: number;
  crossfade: number;
}

export interface BeatovenSettings {
  style: 'cinematic' | 'electronic' | 'ambient' | 'lofi' | 'orchestral';
  mood: 'epic' | 'uplifting' | 'dramatic' | 'peaceful' | 'energetic' | 'meditative';
  duration: number; // in seconds
  name: string;
  description?: string;
}

export interface BeatovenResponse {
  id: string;
  name: string;
  style: string;
  mood: string;
  duration: number;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  track_url?: string;
  created_at: string;
  updated_at: string;
}

export interface MusicGeneratorProps {
  onMusicGenerated: (url: string) => void;
  settings: MusicSettings;
  onSettingsChange: (settings: MusicSettings) => void;
}
