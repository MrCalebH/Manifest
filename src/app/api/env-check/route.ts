import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    BEATOVEN_API_KEY: {
      exists: !!process.env.BEATOVEN_API_KEY,
      length: process.env.BEATOVEN_API_KEY?.length || 0,
      prefix: process.env.BEATOVEN_API_KEY?.substring(0, 3) || 'none',
      format: process.env.BEATOVEN_API_KEY?.match(/^[a-zA-Z0-9_-]+$/) ? 'valid' : 'invalid'
    },
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV
  };

  return NextResponse.json({
    message: 'Environment variables check',
    env: envVars,
    timestamp: new Date().toISOString()
  });
} 