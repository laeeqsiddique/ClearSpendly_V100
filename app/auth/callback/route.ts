import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  const returnTo = searchParams.get('returnTo') ?? '/dashboard'

  console.log('Auth callback called:', { code: !!code, error, error_description, returnTo })

  // Get the production URL
  const productionUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flowvya.com'

  // Handle OAuth errors from the provider
  if (error) {
    console.error('OAuth provider error:', { 
      error, 
      error_description,
      searchParams: Object.fromEntries(searchParams.entries()),
      url: request.url
    })
    
    // Redirect to sign-in with error
    return NextResponse.redirect(`${productionUrl}/sign-in?error=${error}&description=${encodeURIComponent(error_description || '')}`)
  }

  if (code) {
    try {
      const supabase = await createClient()
      console.log('Exchanging OAuth code for session...')
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error.message)
        return NextResponse.redirect(`${productionUrl}/sign-in?error=auth_failed&details=${encodeURIComponent(error.message)}`)
      }

      if (data.user) {
        console.log('OAuth user authenticated:', data.user.email)
        
        // For now, just redirect to onboarding - let onboarding handle tenant setup
        return NextResponse.redirect(`${productionUrl}/onboarding`)
      }
    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(`${productionUrl}/sign-in?error=unexpected_error`)
    }
  }

  // No code provided
  return NextResponse.redirect(`${productionUrl}/sign-in?error=no_code`)
}