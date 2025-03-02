import { NextResponse } from 'next/server';

const BEATOVEN_API_KEY = process.env.BEATOVEN_API_KEY;

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    console.log('Received request:', { prompt });

    // Step 1: Create track
    const createResponse = await fetch('/api/beatoven/tracks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${BEATOVEN_API_KEY}`
      },
      body: JSON.stringify({
        prompt: {
          text: prompt.text
        }
      })
    });

    // Log raw response for debugging
    const responseText = await createResponse.text();
    console.log('Create Response:', {
      status: createResponse.status,
      statusText: createResponse.statusText,
      body: responseText,
      headers: Object.fromEntries(createResponse.headers.entries())
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create track: ${createResponse.status} - ${responseText}`);
    }

    // Parse response after checking ok status
    const createData = JSON.parse(responseText);
    console.log('Track created:', createData);

    if (!createData.tracks?.[0]) {
      throw new Error('No track ID received');
    }

    const trackId = createData.tracks[0];

    // Step 2: Start composition
    const composeResponse = await fetch(`/api/beatoven/tracks/${trackId}/compose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${BEATOVEN_API_KEY}`
      },
      body: JSON.stringify({
        format: 'mp3',
        looping: false
      })
    });

    if (!composeResponse.ok) {
      const errorText = await composeResponse.text();
      throw new Error(`Failed to start composition: ${composeResponse.status} - ${errorText}`);
    }

    const composeData = await composeResponse.json();
    console.log('Composition started:', composeData);

    // Step 3: Poll for completion
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`/api/beatoven/tasks/${composeData.task_id}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${BEATOVEN_API_KEY}`
        }
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        throw new Error(`Failed to check status: ${statusResponse.status} - ${errorText}`);
      }

      const status = await statusResponse.json();
      console.log('Task status:', status);

      if (status.status === 'composed' && status.meta?.track_url) {
        return NextResponse.json({
          trackUrl: status.meta.track_url,
          duration: status.meta.duration || 60,
          id: trackId
        });
      }

      if (status.status === 'failed') {
        throw new Error('Track generation failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error('Track generation timed out');

  } catch (error) {
    console.error('Music generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate music', 
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 