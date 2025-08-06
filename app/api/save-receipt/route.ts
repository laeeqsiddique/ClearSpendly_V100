import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Build-time safe route
export async function POST(request: NextRequest) {
  // Avoid complex operations during build
  if (process.env.NODE_ENV === 'production' && !process.env.RAILWAY_ENVIRONMENT) {
    return NextResponse.json({
      success: false,
      error: 'Route not available during build'
    }, { status: 503 });
  }

  return NextResponse.json({
    success: true,
    message: 'Receipt saving - feature coming soon'
  });
}