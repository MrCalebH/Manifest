'use client';

export class AudioGenerator {
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async generateBinauralBeats(frequency: number, duration: number): Promise<AudioBuffer> {
    const sampleRate = this.audioContext.sampleRate;
    const numberOfSamples = duration * sampleRate;
    const buffer = this.audioContext.createBuffer(2, numberOfSamples, sampleRate);
    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.getChannelData(1);

    // Base frequency (carrier wave)
    const baseFreq = 440;
    
    // Calculate frequencies for left and right channels
    const leftFreq = baseFreq;
    const rightFreq = baseFreq + frequency;

    for (let i = 0; i < numberOfSamples; i++) {
      const time = i / sampleRate;
      leftChannel[i] = 0.5 * Math.sin(2 * Math.PI * leftFreq * time);
      rightChannel[i] = 0.5 * Math.sin(2 * Math.PI * rightFreq * time);
    }

    return buffer;
  }

  async generateAmbient(duration: number): Promise<AudioBuffer> {
    const sampleRate = this.audioContext.sampleRate;
    const numberOfSamples = duration * sampleRate;
    const buffer = this.audioContext.createBuffer(2, numberOfSamples, sampleRate);
    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.getChannelData(1);

    // Generate ambient pad sound
    const frequencies = [220, 277.18, 329.63, 440]; // A3, C#4, E4, A4
    
    for (let i = 0; i < numberOfSamples; i++) {
      const time = i / sampleRate;
      let left = 0;
      let right = 0;

      frequencies.forEach((freq, index) => {
        const amp = 0.15 / frequencies.length;
        left += amp * Math.sin(2 * Math.PI * freq * time);
        right += amp * Math.sin(2 * Math.PI * freq * time + 0.1);
      });

      leftChannel[i] = left;
      rightChannel[i] = right;
    }

    return buffer;
  }

  async mixAudioTracks(tracks: AudioTrack[]): Promise<AudioBuffer> {
    const maxDuration = Math.max(
      ...tracks.map(track => track.buffer.duration)
    );
    
    const outputBuffer = this.audioContext.createBuffer(
      2,
      maxDuration * this.audioContext.sampleRate,
      this.audioContext.sampleRate
    );

    tracks.forEach(track => {
      const volume = track.settings?.volume || 1;
      
      for (let channel = 0; channel < 2; channel++) {
        const outputData = outputBuffer.getChannelData(channel);
        const inputData = track.buffer.getChannelData(channel);
        
        for (let i = 0; i < inputData.length; i++) {
          outputData[i] += inputData[i] * volume;
        }
      }
    });

    return outputBuffer;
  }

  async createFinalMix(voiceBuffer: ArrayBuffer, musicSettings: MusicSettings): Promise<ArrayBuffer> {
    // Convert voice ArrayBuffer to AudioBuffer
    const voiceAudioBuffer = await this.audioContext.decodeAudioData(voiceBuffer);
    
    // Generate background music/beats
    let musicBuffer;
    if (musicSettings.style === 'binaural') {
      musicBuffer = await this.generateBinauralBeats(
        musicSettings.binauralFrequency || 7.83, // Default to Schumann resonance
        voiceAudioBuffer.duration
      );
    } else {
      musicBuffer = await this.generateAmbient(voiceAudioBuffer.duration);
    }

    // Mix tracks
    const mixedBuffer = await this.mixAudioTracks([
      {
        type: 'voice',
        buffer: voiceAudioBuffer,
        settings: { volume: 1 }
      },
      {
        type: musicSettings.style === 'binaural' ? 'binaural' : 'music',
        buffer: musicBuffer,
        settings: { 
          volume: musicSettings.volume,
          frequency: musicSettings.binauralFrequency
        }
      }
    ]);

    // Convert back to ArrayBuffer
    const finalBuffer = await this.encodeToMP3(mixedBuffer);
    return finalBuffer;
  }

  private async encodeToMP3(audioBuffer: AudioBuffer): Promise<ArrayBuffer> {
    // For now, just convert AudioBuffer to ArrayBuffer
    // TODO: Implement proper MP3 encoding
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numberOfChannels * 2;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    let offset = 0;
    
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = audioBuffer.getChannelData(channel)[i];
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return buffer;
  }
} 