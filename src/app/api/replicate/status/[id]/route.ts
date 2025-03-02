import { NextResponse } from 'next/server';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'API token not configured' },
        { status: 500 }
      );
    }

    const predictionId = params.id;

    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: {
          "Authorization": `Token ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Raw Replicate response:', {
      status: data.status,
      output: data.output,
      logs: data.logs,
      error: data.error
    });

    let processedOutput = data.output;
    if (Array.isArray(processedOutput)) {
      processedOutput = processedOutput[0];
    } else if (typeof processedOutput === 'object') {
      processedOutput = processedOutput.audio || processedOutput.url;
    }

    console.log('Processed output:', processedOutput);

    return NextResponse.json({
      status: data.status,
      output: processedOutput,
      error: data.error,
      progress: data.status === 'processing' 
        ? Math.round((data.logs?.length || 0) / 100 * 100)
        : data.status === 'succeeded' ? 100 : 0
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
} 