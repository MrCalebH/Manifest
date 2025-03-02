import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
  }

  try {
    console.log('Proxying request to:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Proxy fetch error:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    console.log('Content type:', contentType);

    const buffer = await response.arrayBuffer();
    console.log('Received buffer size:', buffer.byteLength);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType || 'audio/wav',
        'Content-Length': buffer.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
    },
  });
} 