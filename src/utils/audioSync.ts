export class AudioSynchronizer {
  private audioContext: AudioContext;
  private musicSource: AudioBufferSourceNode | null = null;
  private speechSource: AudioBufferSourceNode | null = null;
  private analyzer: AnalyserNode;

  constructor() {
    this.audioContext = new AudioContext();
    this.analyzer = this.audioContext.createAnalyser();
    this.analyzer.fftSize = 2048;
  }

  async loadAudio(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  async synchronizeAudio(musicUrl: string, speechUrl: string) {
    try {
      const [musicBuffer, speechBuffer] = await Promise.all([
        this.loadAudio(musicUrl),
        this.loadAudio(speechUrl)
      ]);

      // Add a longer intro
      const introDelay = 3; // 3 seconds of music before speech
      const beats = await this.detectBeats(musicBuffer);
      const firstBeat = beats.find(beat => beat > introDelay) || introDelay;

      // Create sources
      this.musicSource = this.audioContext.createBufferSource();
      this.speechSource = this.audioContext.createBufferSource();
      
      // Set buffers
      this.musicSource.buffer = musicBuffer;
      this.speechSource.buffer = speechBuffer;

      // Create gain nodes for volume control
      const musicGain = this.audioContext.createGain();
      const speechGain = this.audioContext.createGain();

      // Connect nodes
      this.musicSource.connect(musicGain);
      this.speechSource.connect(speechGain);
      musicGain.connect(this.audioContext.destination);
      speechGain.connect(this.audioContext.destination);

      // Set initial volumes
      musicGain.gain.value = 0.7; // Music starts at 70%
      speechGain.gain.value = 1.0; // Speech at full volume

      // Adjust speech playback rate for better pacing
      this.speechSource.playbackRate.value = 0.95; // Slightly slower speech

      // Crossfade the volume changes
      const fadeTime = 0.5; // Half second fades
      
      // Start music at full volume
      musicGain.gain.setValueAtTime(0.8, 0);
      
      // Fade music down before speech
      musicGain.gain.setValueCurveAtTime(
        new Float32Array([0.8, 0.3]), 
        firstBeat - fadeTime, 
        fadeTime
      );

      // Start speech after intro
      this.speechSource.start(firstBeat);

      // Fade music back up after speech
      const speechEnd = firstBeat + (speechBuffer.duration * (1/0.95));
      musicGain.gain.setValueCurveAtTime(
        new Float32Array([0.3, 0.8]),
        speechEnd,
        fadeTime
      );
    } catch (error) {
      console.error('Error synchronizing audio:', error);
    }
  }

  private async detectBeats(buffer: AudioBuffer): Promise<number[]> {
    const data = buffer.getChannelData(0);
    const beats: number[] = [];
    
    // Simple beat detection
    const sampleRate = buffer.sampleRate;
    const samplesPerBeat = sampleRate / 4; // Assume 120 BPM
    
    for (let i = 0; i < data.length; i += samplesPerBeat) {
      let sum = 0;
      for (let j = 0; j < samplesPerBeat; j++) {
        sum += Math.abs(data[i + j]);
      }
      const average = sum / samplesPerBeat;
      
      if (average > 0.1) { // Threshold for beat detection
        beats.push(i / sampleRate);
      }
    }
    
    return beats;
  }

  stop() {
    this.musicSource?.stop();
    this.speechSource?.stop();
  }
} 