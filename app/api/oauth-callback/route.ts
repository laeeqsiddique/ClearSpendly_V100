import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authEmailService } from '@/lib/auth-email-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const error = searchParams.get('error')
    const error_description = searchParams.get('error_description')
    const code = searchParams.get('code')
    const returnTo = searchParams.get('returnTo')
    
    console.log('OAuth callback API route called:', {
      error,
      error_description,
      code: !!code,
      returnTo,
      url: request.url
    })
    
    // Use www subdomain since that's where API routes work
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.flowvya.com'
    
    if (error) {
      // OAuth failed - redirect to sign-in with error and preserve returnTo
      const errorParams = new URLSearchParams({
        oauth_error: error,
        description: error_description || ''
      })
      if (returnTo) {
        errorParams.set('returnTo', returnTo)
      }
      const redirectUrl = `${baseUrl}/sign-in?${errorParams.toString()}`
      console.log('Redirecting to error page:', redirectUrl)
      return NextResponse.redirect(redirectUrl)
    }
    
    if (code) {
      // OAuth succeeded - Exchange the code for a session first
      console.log('Exchanging OAuth code for session...')
      
      const supabase = await createClient()
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        console.error('Session exchange failed:', sessionError)
        const errorParams = new URLSearchParams({
          oauth_error: 'session_failed',
          description: 'Failed to establish session'
        })
        if (returnTo) {
          errorParams.set('returnTo', returnTo)
        }
        return NextResponse.redirect(`${baseUrl}/sign-in?${errorParams.toString()}`)
      }
      
      if (data.user) {
        console.log('Session established for user:', data.user.email)
        
        // Check if this is a new user and handle email verification/welcome email
        try {
          // Get user data from our database
          const { data: userData, error: userError } = await supabase
            .from('user')
            .select('id, email, full_name, welcome_email_sent, email_verified')
            .eq('id', data.user.id)
            .single()

          let isNewUser = false
          let shouldSendWelcome = false

          if (userError && userError.code === 'PGRST116') {
            // User doesn't exist in our database, create them
            isNewUser = true
            const { data: newUser, error: insertError } = await supabase
              .from('user')
              .insert({
                id: data.user.id,
                email: data.user.email || '',
                full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
                avatar_url: data.user.user_metadata?.avatar_url || null,
                email_verified: true, // OAuth users are pre-verified
                email_verified_at: new Date().toISOString(),
                welcome_email_sent: false
              })
              .select()
              .single()

            if (insertError) {
              console.error('Error creating user record:', insertError)
            } else {
              console.log('Created new user record for OAuth user:', data.user.email)
              shouldSendWelcome = true
            }
          } else if (userData && !userData.welcome_email_sent) {
            // Existing user but welcome email never sent
            shouldSendWelcome = true
          }

          // Send welcome email for new OAuth users or existing users who never got one
          if (shouldSendWelcome && data.user.email) {
            console.log('Sending welcome email for OAuth user:', data.user.email)
            
            // Send welcome email in background (don't wait for it)
            authEmailService.sendWelcomeEmail({
              email: data.user.email,
              fullName: userData?.full_name || data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'there',
              isOAuthUser: true,
              // No verification token needed for OAuth users as they're pre-verified
              tenantName: undefined // Will be set once they complete onboarding
            }).catch(error => {
              console.error('Error sending welcome email:', error)
              // Don't fail the OAuth flow if email fails
            })
          }
        } catch (emailError) {
          console.error('Error handling email verification/welcome flow:', emailError)
          // Continue with OAuth flow even if email handling fails
        }
        
        // Now redirect to onboarding with established session
        let redirectUrl = `${baseUrl}/onboarding`
        
        // Preserve the returnTo parameter so onboarding knows where to go after setup
        if (returnTo && returnTo !== '/onboarding') {
          redirectUrl += `?returnTo=${encodeURIComponent(returnTo)}`
        }
        
        console.log('Redirecting authenticated user to onboarding:', redirectUrl)
        
        // Create response with session cookies
        const response = NextResponse.redirect(redirectUrl)
        
        // The session should already be set by exchangeCodeForSession, but let's ensure it
        return response
      } else {
        console.error('No user data after session exchange')
        return NextResponse.redirect(`${baseUrl}/sign-in?oauth_error=no_user_data`)
      }
    }
    
    // No code or error - redirect to sign-in with returnTo preserved
    const signInParams = new URLSearchParams()
    if (returnTo) {
      signInParams.set('returnTo', returnTo)
    }
    const redirectUrl = `${baseUrl}/sign-in${signInParams.toString() ? '?' + signInParams.toString() : ''}`
    console.log('No params, redirecting to sign-in:', redirectUrl)
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.json({ error: 'OAuth callback failed' }, { status: 500 })
  }
}