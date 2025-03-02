import { NextResponse } from 'next/server';
import { TTSSettings } from '@/types';
import { AudioGenerator } from '@/services/audioGenerator';

// Move API key to server-side only
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;

export async function POST(request: Request) {
  try {
    const { text, voiceId, stability, similarityBoost, modelId } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!ELEVENLABS_API_KEY) {
      console.error('API key not found');
      return NextResponse.json({ error: 'API key is not configured' }, { status: 500 });
    }

    // Get voice details first
    const voiceResponse = await fetch(
      `https://api.elevenlabs.io/v1/voices/${voiceId}`,
      {
        headers: {
          'Accept': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!voiceResponse.ok) {
      console.error('Voice fetch error:', {
        status: voiceResponse.status,
        statusText: voiceResponse.statusText,
        voiceId
      });
      return NextResponse.json({
        error: 'Voice not accessible',
        details: `Failed to fetch voice: ${voiceResponse.status} ${voiceResponse.statusText}`
      }, { status: voiceResponse.status });
    }

    const voiceData = await voiceResponse.json();
    console.log('Voice details:', {
      id: voiceData.voice_id,
      name: voiceData.name,
      category: voiceData.category
    });

    // Make TTS request with appropriate settings for cloned voice
    const ttsRequestBody = {
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost
      }
    };

    console.log('Making TTS request:', {
      voiceId,
      textLength: text.length,
      category: voiceData.category,
      settings: ttsRequestBody.voice_settings
    });

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify(ttsRequestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs Error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        voiceId,
        category: voiceData.category
      });

      return NextResponse.json({
        error: `API Error (${response.status}): ${response.statusText}`,
        voiceId,
        details: errorText
      }, { status: response.status });
    }

    const audioData = await response.arrayBuffer();
    
    // Mix with music if music settings are provided
    if (voiceData.category === 'music') {
      const audioGenerator = new AudioGenerator();
      const mixedAudio = await audioGenerator.createFinalMix(audioData, {
        style: 0.5,
        use_speaker_boost: true
      });
      
      return new NextResponse(mixedAudio, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': mixedAudio.byteLength.toString(),
        },
      });
    }

    // Return voice-only audio if no music settings
    return new NextResponse(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json({
      error: 'Failed to generate speech',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 