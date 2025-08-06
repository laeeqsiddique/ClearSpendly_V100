import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !process.env.RAILWAY_ENVIRONMENT) {
    return NextResponse.json({ error: 'Route not available during build' }, { status: 503 })
  }

  return NextResponse.json({ success: true, message: 'Cleanup job - feature coming soon' })
}