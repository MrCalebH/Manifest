import { NextResponse } from 'next/server';
import { generateAmbientTrack } from '@/utils/generateAudio';

export async function GET() {
  try {
    const sampleRate = 44100;
    const numChannels = 2;
    const bitsPerSample = 16;
    
    // Generate raw PCM data
    const pcmData = generateAmbientTrack(60);
    
    // Create WAV file structure
    const dataSize = pcmData.byteLength;
    const totalSize = 44 + dataSize; // Header is 44 bytes
    
    // Create the final buffer
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    
    // Write WAV header
    // "RIFF" chunk
    writeString(view, 0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    writeString(view, 8, 'WAVE');
    
    // "fmt " chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Chunk size
    view.setUint16(20, 1, true); // Audio format (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true); // Byte rate
    view.setUint16(32, numChannels * (bitsPerSample / 8), true); // Block align
    view.setUint16(34, bitsPerSample, true);
    
    // "data" chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Copy PCM data
    new Uint8Array(buffer).set(new Uint8Array(pcmData), 44);
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Audio generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate audio',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
} 