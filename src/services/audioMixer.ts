'use client';

import { MusicSettings, BeatovenSettings } from '@/types';

interface BeatovenResponse {
  trackUrl: string;
  duration: number;
}

export class AudioMixer {
  private audioContext: AudioContext;
  private voiceBuffer: AudioBuffer | null = null;
  private musicBuffer: AudioBuffer | null = null;
  private voiceSource: AudioBufferSourceNode | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private voiceGain: GainNode;
  private musicGain: GainNode;
  private readonly MIN_DURATION = 60; // Minimum 1 minute
  private isPlaying = false;
  private mixBuffer: AudioBuffer | null = null;

  constructor() {
    this.audioContext = new AudioContext();
    this.voiceGain = this.audioContext.createGain();
    this.musicGain = this.audioContext.createGain();
    
    // Connect gains to output
    this.voiceGain.connect(this.audioContext.destination);
    this.musicGain.connect(this.audioContext.destination);
  }

  async generateBeatovenTrack(settings: MusicSettings): Promise<BeatovenResponse> {
    console.log('Generating Beatoven track with settings:', settings);

    const beatovenSettings: BeatovenSettings = {
      style: settings.style,
      mood: settings.mood || 'epic',
      duration: Math.max(this.MIN_DURATION, 60),
      tempo: settings.tempo * 140 + 60, // Map 0-1 to 60-200 BPM
      intensity: settings.volume, // Use volume as intensity
      sections: {
        intro: true,
        buildup: true,
        drop: settings.volume > 0.6, // Add dramatic peak for higher volumes
        outro: true
      },
      prompt: settings.prompt
    };

    console.log('Sending to Beatoven API:', beatovenSettings);

    const response = await fetch('/api/music', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(beatovenSettings)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Beatoven API error:', error);
      throw new Error('Failed to generate music');
    }

    const data = await response.json();
    console.log('Beatoven API response:', data);
    return data;
  }

  async loadVoice(audioUrl: string) {
    try {
      console.log('Loading voice from:', audioUrl);
      
      if (this.isPlaying) {
        await this.stop();
      }

      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const voiceBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Create repeated affirmations with gaps
      const gapDuration = 5; // 5 seconds gap
      const repetitions = Math.ceil(this.MIN_DURATION / (voiceBuffer.duration + gapDuration));
      const totalDuration = repetitions * (voiceBuffer.duration + gapDuration);
      
      console.log('Voice buffer details:', {
        originalDuration: voiceBuffer.duration,
        repetitions,
        totalDuration
      });

      const repeatedBuffer = this.audioContext.createBuffer(
        voiceBuffer.numberOfChannels,
        totalDuration * this.audioContext.sampleRate,
        this.audioContext.sampleRate
      );

      for (let channel = 0; channel < voiceBuffer.numberOfChannels; channel++) {
        const inputData = voiceBuffer.getChannelData(channel);
        const outputData = repeatedBuffer.getChannelData(channel);
        
        for (let rep = 0; rep < repetitions; rep++) {
          const startSample = rep * (voiceBuffer.length + gapDuration * this.audioContext.sampleRate);
          
          // Add fade in/out for each repetition
          for (let i = 0; i < voiceBuffer.length; i++) {
            outputData[startSample + i] = inputData[i] * this.getFade(i, voiceBuffer.length);
          }
        }
      }
      
      this.voiceBuffer = repeatedBuffer;
      
      return repeatedBuffer.duration;
    } catch (error) {
      console.error('Error loading voice:', error);
      throw error;
    }
  }

  private getFade(index: number, length: number): number {
    const fadeLength = Math.min(2000, length * 0.1); // Shorter fades
    
    if (index < fadeLength) {
      // Fade in
      return 0.8 + (0.2 * (index / fadeLength)); // Start at 80% volume
    } else if (index > length - fadeLength) {
      // Fade out
      return 0.8 + (0.2 * ((length - index) / fadeLength));
    }
    return 1;
  }

  async loadMusic(musicUrl: string) {
    try {
      console.log('Loading music from:', musicUrl);
      
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(musicUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to load music: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const musicBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      console.log('Music buffer loaded:', {
        duration: musicBuffer.duration,
        channels: musicBuffer.numberOfChannels
      });

      this.musicBuffer = musicBuffer;
    } catch (error) {
      console.error('Error loading music:', error);
      throw error;
    }
  }

  async createEpicMix(voiceUrl: string, musicUrl: string, settings: MusicSettings): Promise<ArrayBuffer> {
    try {
      // Load audio files
      const [voiceArrayBuffer, musicArrayBuffer] = await Promise.all([
        fetch(voiceUrl).then(r => r.arrayBuffer()),
        fetch(musicUrl).then(r => r.arrayBuffer())
      ]);

      // Decode audio data
      [this.voiceBuffer, this.musicBuffer] = await Promise.all([
        this.audioContext.decodeAudioData(voiceArrayBuffer),
        this.audioContext.decodeAudioData(musicArrayBuffer)
      ]);

      // Process voice for better pacing
      this.voiceBuffer = await this.processVoice(this.voiceBuffer, settings);

      // Calculate volumes based on intensity
      let musicVolume = 0.8; // Increased base volume
      let voiceVolume = 1.0;

      switch (settings.intensity) {
        case 'Gentle':
          musicVolume = 0.6;
          voiceVolume = 1.0;
          break;
        case 'Balanced':
          musicVolume = 0.8;
          voiceVolume = 1.0;
          break;
        case 'Strong':
          musicVolume = 1.0;
          voiceVolume = 0.9; // Slightly reduce voice for powerful music
          break;
      }

      // Set initial volumes
      this.setVolumes(voiceVolume, musicVolume);

      // Create an offline context for rendering
      const offlineCtx = new OfflineAudioContext({
        numberOfChannels: 2,
        length: 44100 * Math.max(this.voiceBuffer!.duration, this.musicBuffer!.duration),
        sampleRate: 44100
      });

      // Set up sources and gains in offline context
      const musicSource = offlineCtx.createBufferSource();
      const voiceSource = offlineCtx.createBufferSource();
      const musicGain = offlineCtx.createGain();
      const voiceGain = offlineCtx.createGain();

      musicSource.buffer = this.musicBuffer;
      voiceSource.buffer = this.voiceBuffer;

      // Connect nodes
      musicSource.connect(musicGain);
      voiceSource.connect(voiceGain);
      musicGain.connect(offlineCtx.destination);
      voiceGain.connect(offlineCtx.destination);

      // Set gains based on settings
      voiceGain.gain.value = 1.0;
      musicGain.gain.value = settings.volume * 0.7;

      // Start playback
      musicSource.start(0);
      voiceSource.start(3); // 3 second intro

      // Render the mix
      const renderedBuffer = await offlineCtx.startRendering();
      
      // Convert to WAV
      const wavData = this.audioBufferToWav(renderedBuffer);
      
      // Store for playback
      this.mixBuffer = await this.audioContext.decodeAudioData(wavData.buffer);
      
      return wavData.buffer;
    } catch (error) {
      console.error('Error creating epic mix:', error);
      throw error;
    }
  }

  private async processVoice(buffer: AudioBuffer, settings: MusicSettings): Promise<AudioBuffer> {
    // Create a new buffer for processed audio
    const processedBuffer = this.audioContext.createBuffer(
      buffer.numberOfChannels,
      buffer.length * 1.5, // Add 50% more space for pauses
      buffer.sampleRate
    );

    // Calculate pause duration based on tempo
    const pauseDuration = this.getPauseDuration(settings.tempo);
    
    // Calculate beats per minute
    const bpm = this.getBPM(settings.tempo);
    const samplesPerBeat = (buffer.sampleRate * 60) / bpm;

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      let outputIndex = 0;

      // Split voice into segments and add pauses
      const segmentLength = Math.floor(samplesPerBeat * 4); // 4 beats per segment
      for (let i = 0; i < inputData.length; i += segmentLength) {
        // Copy segment
        for (let j = 0; j < segmentLength && (i + j) < inputData.length; j++) {
          outputData[outputIndex] = inputData[i + j] * this.getFade(j, segmentLength);
          outputIndex++;
        }

        // Add pause
        outputIndex += Math.floor(pauseDuration * buffer.sampleRate);
      }
    }

    return processedBuffer;
  }

  private getPauseDuration(tempo: string): number {
    switch (tempo) {
      case 'Slow':
        return 1.0; // 1 second pause
      case 'Medium':
        return 0.7; // 0.7 second pause
      case 'Fast':
        return 0.4; // 0.4 second pause
      default:
        return 0.7;
    }
  }

  private getBPM(tempo: string): number {
    switch (tempo) {
      case 'Slow':
        return 70;
      case 'Medium':
        return 100;
      case 'Fast':
        return 130;
      default:
        return 100;
    }
  }

  private setVolumes(voiceVolume: number, musicVolume: number) {
    try {
      // Ensure volumes are valid numbers between 0.0001 and 1
      voiceVolume = Math.max(0.0001, Math.min(1, Number(voiceVolume) || 0.0001));
      musicVolume = Math.max(0.0001, Math.min(1, Number(musicVolume) || 0.0001));

      // Verify values are finite
      if (!Number.isFinite(voiceVolume) || !Number.isFinite(musicVolume)) {
        console.error('Invalid volume values:', { voiceVolume, musicVolume });
        // Use safe default values
        voiceVolume = 1;
        musicVolume = 0.3;
      }

      const now = this.audioContext.currentTime;
      
      // Set current values first
      this.voiceGain.gain.setValueAtTime(this.voiceGain.gain.value || 0.0001, now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value || 0.0001, now);

      // Then ramp to new values
      this.voiceGain.gain.exponentialRampToValueAtTime(voiceVolume, now + 0.1);
      this.musicGain.gain.exponentialRampToValueAtTime(musicVolume * 0.3, now + 0.1);

      console.log('Volumes set:', {
        voice: voiceVolume,
        music: musicVolume * 0.3,
        currentTime: now
      });
    } catch (error) {
      console.error('Error setting volumes:', error);
      // Set safe default values immediately
      this.voiceGain.gain.setValueAtTime(1, this.audioContext.currentTime);
      this.musicGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    }
  }

  play() {
    if (!this.voiceBuffer || !this.musicBuffer) {
      throw new Error('Audio not loaded');
    }

    // Create new sources
    this.voiceSource = this.audioContext.createBufferSource();
    this.musicSource = this.audioContext.createBufferSource();

    // Set buffers
    this.voiceSource.buffer = this.voiceBuffer;
    this.musicSource.buffer = this.musicBuffer;

    // Adjust playback rate based on tempo
    const tempo = this.getBPM(this.currentSettings?.tempo || 'Medium');
    this.voiceSource.playbackRate.value = 0.85; // Slow down voice slightly

    // Connect sources to gains
    this.voiceSource.connect(this.voiceGain);
    this.musicSource.connect(this.musicGain);

    // Start playback
    const startTime = this.audioContext.currentTime;
    const introDelay = 3; // 3 second intro

    this.musicSource.start(startTime);
    this.voiceSource.start(startTime + introDelay);
  }

  stop() {
    this.voiceSource?.stop();
    this.musicSource?.stop();
    this.voiceSource?.disconnect();
    this.musicSource?.disconnect();
    this.voiceSource = null;
    this.musicSource = null;
  }

  private audioBufferToWav(buffer: AudioBuffer): Uint8Array {
    // Simple WAV encoding - you might want to use a library like wavefile for better quality
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2;
    const buffer32 = new Float32Array(length);
    const view = new DataView(new ArrayBuffer(44 + length));
    let offset = 0;
    let pos = 0;

    // Write WAV header
    writeString("RIFF");
    view.setUint32(offset, 36 + length, true); offset += 4;
    writeString("WAVE");
    writeString("fmt ");
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2;
    view.setUint16(offset, numOfChan, true); offset += 2;
    view.setUint32(offset, buffer.sampleRate, true); offset += 4;
    view.setUint32(offset, buffer.sampleRate * 2 * numOfChan, true); offset += 4;
    view.setUint16(offset, numOfChan * 2, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2;
    writeString("data");
    view.setUint32(offset, length, true); offset += 4;

    // Write audio data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      const channel = buffer.getChannelData(i);
      for (let j = 0; j < channel.length; j++) {
        view.setInt16(offset, channel[j] * 0x7FFF, true);
        offset += 2;
      }
    }

    function writeString(str: string) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
      offset += str.length;
    }

    return new Uint8Array(view.buffer);
  }
} 