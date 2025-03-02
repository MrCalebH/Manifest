import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  // Only run on /api/beatoven routes
  if (!request.nextUrl.pathname.startsWith('/api/beatoven')) {
    return NextResponse.next();
  }

  try {
    // Get the Beatoven path from the request URL
    const beatovenPath = request.nextUrl.pathname.replace('/api/beatoven', '');
    const beatovenUrl = `https://api.beatoven.ai/v1${beatovenPath}`;

    // Log request details
    console.log('Beatoven request:', {
      url: beatovenUrl,
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer [REDACTED]'
      }
    });

    // Clone the request to get the body
    const requestBody = await request.clone().text();
    console.log('Request body:', requestBody);

    // Make the request to Beatoven
    const beatovenResponse = await fetch(beatovenUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.BEATOVEN_API_KEY}`
      },
      body: request.method !== 'GET' ? requestBody : undefined,
      cache: 'no-store'
    });

    // Get the response data
    const responseData = await beatovenResponse.text();
    console.log('Beatoven response:', {
      status: beatovenResponse.status,
      statusText: beatovenResponse.statusText,
      body: responseData
    });

    // Try to parse response as JSON
    try {
      const jsonData = JSON.parse(responseData);
      return new NextResponse(JSON.stringify(jsonData), {
        status: beatovenResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    } catch {
      // If not JSON, return error
      return new NextResponse(
        JSON.stringify({
          error: 'Invalid response from Beatoven',
          details: responseData
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
  } catch (error) {
    console.error('Middleware error:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to process request',
        details: error.message,
        stack: error.stack
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

export const config = {
  matcher: ['/api/beatoven/:path*'],
}; 