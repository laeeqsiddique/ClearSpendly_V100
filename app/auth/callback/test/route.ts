import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'Auth callback route is working!',
    timestamp: new Date().toISOString(),
    path: '/auth/callback/test'
  })
}