import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  const code = searchParams.get('code')
  
  console.log('OAuth callback API route called:', {
    error,
    error_description,
    code: !!code
  })
  
  // Simple redirect based on OAuth result
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flowvya.com'
  
  if (error) {
    // OAuth failed - redirect to sign-in with error
    return NextResponse.redirect(`${baseUrl}/sign-in?oauth_error=${error}&description=${encodeURIComponent(error_description || '')}`)
  }
  
  if (code) {
    // OAuth succeeded - redirect to onboarding
    // The actual auth exchange will happen client-side
    return NextResponse.redirect(`${baseUrl}/onboarding?code=${code}`)
  }
  
  // No code or error - redirect to sign-in
  return NextResponse.redirect(`${baseUrl}/sign-in`)
}