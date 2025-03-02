export function generateAmbientTrack(duration: number = 60): ArrayBuffer {
  const sampleRate = 44100;
  const numChannels = 2;
  const numSamples = Math.floor(duration * sampleRate);
  const buffer = new ArrayBuffer(numSamples * numChannels * 2); // 16-bit samples
  const view = new DataView(buffer);

  // Base frequencies for an ambient pad (A minor chord)
  const frequencies = [
    220.00,  // A3
    261.63,  // C4
    329.63,  // E4
    440.00,  // A4
    523.25   // C5
  ];

  // LFO for amplitude modulation
  const lfoFreq = 0.5; // Hz
  const lfoDepth = 0.3;

  // Apply fade in/out
  const fadeTime = 0.1; // seconds
  const fadeSamples = Math.floor(fadeTime * sampleRate);

  for (let i = 0; i < numSamples; i++) {
    const time = i / sampleRate;
    let leftSample = 0;
    let rightSample = 0;

    // Calculate fade multiplier
    let fadeMultiplier = 1;
    if (i < fadeSamples) {
      fadeMultiplier = i / fadeSamples;
    } else if (i > numSamples - fadeSamples) {
      fadeMultiplier = (numSamples - i) / fadeSamples;
    }

    // LFO value
    const lfo = 1 - lfoDepth + lfoDepth * Math.sin(2 * Math.PI * lfoFreq * time);

    // Generate each frequency component
    frequencies.forEach((freq, index) => {
      const amp = 0.15 * lfo * fadeMultiplier;
      const phaseOffset = index * 0.1;
      
      const leftPhase = 2 * Math.PI * freq * time;
      const rightPhase = leftPhase + phaseOffset;
      
      leftSample += amp * Math.sin(leftPhase) / frequencies.length;
      rightSample += amp * Math.sin(rightPhase) / frequencies.length;
    });

    // Add subtle noise
    const noise = (Math.random() - 0.5) * 0.01 * fadeMultiplier;
    leftSample = Math.max(-0.99, Math.min(0.99, leftSample + noise));
    rightSample = Math.max(-0.99, Math.min(0.99, rightSample + noise));

    // Convert to 16-bit PCM
    const offset = i * 4;
    view.setInt16(offset, Math.floor(leftSample * 32767), true);
    view.setInt16(offset + 2, Math.floor(rightSample * 32767), true);
  }

  return buffer;
} 