interface MusicVariation {
  url: string;
  name: string;
  description: string;
  timestamp: number;
}

interface AudioCacheEntry {
  audio: string; // base64 audio data
  type: string;
  timestamp: number;
  expiresIn: number;
}

export const AudioCache = {
  TTL_24_HOURS: 24 * 60 * 60 * 1000,

  // Music specific methods
  setMusicItem(key: string, variations: MusicVariation[], expiresIn: number = AudioCache.TTL_24_HOURS) {
    if (typeof window === 'undefined') return;

    const validVariations = variations.filter(v => v.url && typeof v.url === 'string');
    if (validVariations.length === 0) return;

    try {
      localStorage.setItem(key, JSON.stringify({
        variations: validVariations,
        timestamp: Date.now(),
        expiresIn
      }));
    } catch (e) {
      console.error('Failed to cache music variations:', e);
    }
  },

  getMusicItem(key: string): MusicVariation[] | null {
    if (typeof window === 'undefined') return null;

    try {
      const entry = localStorage.getItem(key);
      if (!entry) return null;

      const { variations, timestamp, expiresIn } = JSON.parse(entry);
      
      if (Date.now() - timestamp > expiresIn) {
        localStorage.removeItem(key);
        return null;
      }

      return variations;
    } catch (e) {
      console.error('Failed to retrieve cached music:', e);
      return null;
    }
  },

  // TTS specific methods
  async setTTSItem(key: string, audioBlob: Blob, expiresIn: number = AudioCache.TTL_24_HOURS) {
    if (typeof window === 'undefined') return;

    try {
      const buffer = await audioBlob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const entry: AudioCacheEntry = {
        audio: base64,
        type: audioBlob.type,
        timestamp: Date.now(),
        expiresIn
      };

      localStorage.setItem(key, JSON.stringify(entry));
    } catch (e) {
      console.error('Failed to cache TTS audio:', e);
    }
  },

  async getTTSItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    try {
      const entry = localStorage.getItem(key);
      if (!entry) return null;

      const { audio, type, timestamp, expiresIn } = JSON.parse(entry) as AudioCacheEntry;
      
      if (Date.now() - timestamp > expiresIn) {
        localStorage.removeItem(key);
        return null;
      }

      const binaryString = atob(audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBlob = new Blob([bytes], { type });
      return URL.createObjectURL(audioBlob);
    } catch (e) {
      console.error('Failed to retrieve cached TTS:', e);
      return null;
    }
  },

  // Key generation methods
  getTTSKey(text: string): string {
    return `tts_${text.slice(0, 50)}_${text.length}`;
  },

  getMusicKey(prompt: string, settings: MusicSettings): string {
    return `music_${prompt.slice(0, 50)}_${JSON.stringify(settings)}`;
  },

  // Cleanup methods
  removeTTSItem(key: string) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },

  removeMusicItem(key: string) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },

  async clearExpired() {
    if (typeof window === 'undefined') return;
    
    const now = Date.now();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      try {
        if (key.startsWith('tts_')) {
          const entry = await this.getTTSItem(key);
          if (!entry) {
            localStorage.removeItem(key);
          }
        } else if (key.startsWith('music_')) {
          const entry = this.getMusicItem(key);
          if (!entry) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.error('Error clearing cache:', e);
      }
    }
  }
}; 