import { NextResponse } from 'next/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;

export async function GET() {
  try {
    // Test the API key by making a request to get voices
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'Accept': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY!,
      },
    });

    const data = await response.json();

    return NextResponse.json({
      hasApiKey: !!ELEVENLABS_API_KEY,
      apiKeyLength: ELEVENLABS_API_KEY?.length || 0,
      apiKeyValid: response.ok,
      voicesCount: data.voices?.length || 0,
      responseStatus: response.status,
      error: !response.ok ? data : null
    });
  } catch (error) {
    return NextResponse.json({
      hasApiKey: !!ELEVENLABS_API_KEY,
      apiKeyLength: ELEVENLABS_API_KEY?.length || 0,
      apiKeyValid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 