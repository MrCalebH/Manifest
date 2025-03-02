import { NextResponse } from 'next/server';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Add base prompts and constraints
const basePrompts = {
  Uplifting: "Create uplifting, inspiring background music with clear melody and gentle harmonies.",
  Peaceful: "Generate calming, ambient music with soft textures and natural flow.",
  Energetic: "Create dynamic, positive music with clear rhythm and upbeat progression.",
  Dreamy: "Compose ethereal, atmospheric music with flowing melodies and gentle movement.",
  Powerful: "Create impactful, cinematic music with emotional depth and clear structure."
};

const styleGuides = {
  Ambient: "using atmospheric pads and subtle textures",
  Piano: "centered around emotive piano melodies",
  Orchestra: "with orchestral instruments and natural dynamics",
  Electronic: "using modern electronic sounds and clean production",
  Nature: "incorporating gentle nature sounds and organic elements"
};

export async function POST(request: Request) {
  try {
    if (!REPLICATE_API_TOKEN) {
      console.error('Replicate API token is missing');
      return NextResponse.json(
        { error: 'API token not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { prompt, voiceUrl } = body;

    // Build a more controlled prompt
    const basePrompt = basePrompts[body.mood] || basePrompts.Peaceful;
    const styleGuide = styleGuides[body.style] || styleGuides.Ambient;
    const fullPrompt = `${basePrompt} ${styleGuide}. 
      Keep the music clear and well-structured. 
      Maintain consistent key and tempo. 
      Ensure natural transitions and proper musical phrasing. 
      ${prompt.text} ${body.mood} ${body.style}`.trim();

    let voiceBase64;
    if (voiceUrl) {
      try {
        // Use relative URL if it's from our domain
        const url = voiceUrl.startsWith('http') 
          ? `/api/proxy?url=${encodeURIComponent(voiceUrl)}`
          : voiceUrl;

        const voiceResponse = await fetch(url);
        if (!voiceResponse.ok) {
          throw new Error('Failed to fetch voice audio');
        }
        const voiceBuffer = await voiceResponse.arrayBuffer();
        voiceBase64 = Buffer.from(voiceBuffer).toString('base64');
      } catch (error) {
        console.error('Error fetching voice audio:', error);
        // Continue without voice conditioning if voice fetch fails
      }
    }

    // Prepare model input with better defaults
    const modelInput = {
      model_version: "large",
      prompt: fullPrompt,
      duration: body.duration || 30,
      classifier_free_guidance: body.guidance_scale || 7,
      output_format: "wav",
      normalization_strategy: "peak",
      multi_band_diffusion: true,
      // Add parameters for better quality
      temperature: body.temperature || 0.85,
      top_k: 250, // Better sampling
      top_p: 0.95, // Better token selection
      sample_rate: 44100, // Higher quality audio
      guidance_scale: 7, // Stronger prompt adherence
      // Voice conditioning parameters
      voice_conditioning_scale: 1.0, // Default voice influence
      pitch_preservation: true, // Maintain original voice pitch
      rhythm_preservation: true // Maintain timing
    };

    // If using voice conditioning
    if (voiceBase64) {
      Object.assign(modelInput, {
        audio_file: `data:audio/wav;base64,${voiceBase64}`,
        continuation: true,
        use_voice_conditioning: true,
        // Add voice-specific parameters
        voice_preservation_scale: 0.85, // Keep voice more natural
        pitch_adjustment: 0, // No pitch shifting
        tempo_preservation: true // Keep original timing
      });
    }

    // Make request to Replicate
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${REPLICATE_API_TOKEN}`
      },
      body: JSON.stringify({
        version: "b05b1dff1d8c6dc63d14b0cdb42135378dcb87f6373b0d3d341ede46e59e2b38",
        input: modelInput
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Replicate error response:', {
        status: response.status,
        statusText: response.statusText,
        error
      });
      return NextResponse.json(
        { error: 'Music generation failed', details: error },
        { status: response.status }
      );
    }

    const prediction = await response.json();
    console.log('Replicate prediction started:', prediction);

    // Increase max time for longer pieces
    const maxAttempts = Math.max(180, body.duration * 2); // At least 6 minutes, or 2 checks per second of audio
    const pollInterval = 2000; // 2 seconds between checks
    
    let attempts = 0;
    while (attempts < maxAttempts) {
      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            "Authorization": `Token ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
          }
        }
      );

      const status = await statusResponse.json();
      const progress = Math.min(
        100,
        Math.round((attempts / (body.duration * 2)) * 100) // Progress based on duration
      );

      console.log('Generation status:', {
        attempt: attempts + 1,
        maxAttempts,
        status: status.status,
        progress: `${progress}%`,
        timeElapsed: `${(attempts * 2).toFixed(0)} seconds`,
        estimatedTotal: `${body.duration * 2} seconds`,
        audioLength: `${body.duration} seconds`
      });

      if (status.status === 'succeeded') {
        return NextResponse.json({
          url: status.output,
          id: prediction.id
        });
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'Music generation failed');
      }

      if (status.status === 'canceled') {
        throw new Error('Music generation was canceled');
      }

      // Return progress to client
      if (status.status === 'processing') {
        return NextResponse.json({
          status: 'processing',
          progress,
          message: 'Generating music...'
        });
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;
    }

    throw new Error('Generation timed out - please try again');
  } catch (error) {
    console.error('Create music error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create music', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 