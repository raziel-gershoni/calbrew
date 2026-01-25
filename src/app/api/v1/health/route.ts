/**
 * Health check endpoint for API v1
 * No authentication required
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    version: 'v1',
    timestamp: new Date().toISOString(),
  });
}
