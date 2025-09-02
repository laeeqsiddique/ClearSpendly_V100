import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const error = searchParams.get('error')
  const code = searchParams.get('code')
  const type = searchParams.get('type') // Email confirmation type
  
  // Use proper base URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.flowvya.com'
  
  if (error) {
    return NextResponse.redirect(`${baseUrl}/sign-in?error=${error}`)
  }
  
  if (code) {
    try {
      // Exchange code for session (handles both OAuth and email confirmation)
      const supabase = await createClient()
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        console.error('Session exchange error:', sessionError)
        return NextResponse.redirect(`${baseUrl}/sign-in?error=session_failed`)
      }
      
      if (data.user) {
        // If this is email confirmation, mark user as verified in our database
        if (type === 'signup' || type === 'email') {
          const adminSupabase = createAdminClient()
          
          // Update user verification status
          await adminSupabase
            .from('user')
            .update({
              email_verified: true,
              email_verified_at: new Date().toISOString()
            })
            .eq('email', data.user.email)
          
          console.log(`Email verified for user: ${data.user.email}`)
        }
        
        // Redirect to onboarding for new users
        return NextResponse.redirect(`${baseUrl}/onboarding`)
      }
    } catch (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${baseUrl}/sign-in?error=callback_failed`)
    }
  }
  
  return NextResponse.redirect(`${baseUrl}/sign-in`)
}