import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Build-time safe route - temporarily simplified
export async function POST(request: NextRequest) {
  // Avoid Supabase client creation during build
  if (process.env.NODE_ENV === 'production' && !process.env.RAILWAY_ENVIRONMENT) {
    return NextResponse.json({
      success: false,
      error: 'Route not available during build'
    }, { status: 503 });
  }

  return NextResponse.json({
    success: true,
    message: 'Receipt storage - feature coming soon'
  });
}