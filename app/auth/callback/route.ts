import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const error = searchParams.get('error')
  const code = searchParams.get('code')
  
  // Simple redirect logic without complex imports
  const baseUrl = 'https://flowvya.com'
  
  if (error) {
    return NextResponse.redirect(`${baseUrl}/sign-in?error=${error}`)
  }
  
  if (code) {
    // For now, just redirect to onboarding
    // Complex auth logic can be handled client-side
    return NextResponse.redirect(`${baseUrl}/onboarding`)
  }
  
  return NextResponse.redirect(`${baseUrl}/sign-in`)
}