import { NextRequest, NextResponse } from 'next/server'
import { authEmailService } from '@/lib/auth-email-service'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const returnTo = searchParams.get('returnTo')
    
    console.log('Email verification API called:', { token: !!token, returnTo })
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Verify the email token
    const verificationResult = await authEmailService.verifyEmailToken(token)
    
    if (!verificationResult.success) {
      console.log('Email verification failed:', verificationResult)
      
      // Redirect to an error page or back to login with error
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.flowvya.com'
      const errorParams = new URLSearchParams({
        error: 'verification_failed',
        message: 'Invalid or expired verification link'
      })
      
      if (returnTo) {
        errorParams.set('returnTo', returnTo)
      }
      
      return NextResponse.redirect(`${baseUrl}/sign-in?${errorParams.toString()}`)
    }

    console.log('Email verification successful:', verificationResult)
    
    // Get the verified user to update their session
    const supabase = await createClient()
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('*')
      .eq('id', verificationResult.userId!)
      .single()

    if (userError || !user) {
      console.error('Error fetching verified user:', userError)
      return NextResponse.json(
        { success: false, error: 'Failed to update user session' },
        { status: 500 }
      )
    }

    // Redirect to success page or intended destination
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.flowvya.com'
    let redirectUrl = returnTo || `${baseUrl}/dashboard`
    
    // If no returnTo and user hasn't completed onboarding, send to onboarding
    if (!returnTo) {
      // Check if user has completed tenant setup (has at least one membership)
      const { data: memberships, error: membershipError } = await supabase
        .from('membership')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (membershipError || !memberships || memberships.length === 0) {
        redirectUrl = `${baseUrl}/onboarding`
      }
    }
    
    const successParams = new URLSearchParams({
      email_verified: 'true',
      message: 'Email verified successfully!'
    })
    
    redirectUrl += (redirectUrl.includes('?') ? '&' : '?') + successParams.toString()
    
    console.log('Redirecting verified user to:', redirectUrl)
    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Email verification failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body
    
    console.log('Resend verification email request:', { email })
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists and needs verification
    const supabase = await createClient()
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('id, email, full_name, email_verified')
      .eq('email', email)
      .single()

    if (userError || !user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists and needs verification, a verification email has been sent.'
      })
    }

    if (user.email_verified) {
      return NextResponse.json({
        success: true,
        message: 'Email is already verified.'
      })
    }

    // Generate new verification token
    const token = await authEmailService.generateVerificationToken(user.id, user.email)
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate verification token' },
        { status: 500 }
      )
    }

    // Send verification email
    const emailResult = await authEmailService.sendWelcomeEmail({
      email: user.email,
      fullName: user.full_name || 'there',
      verificationToken: token,
      isOAuthUser: false
    })

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error)
      return NextResponse.json(
        { success: false, error: 'Failed to send verification email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully.'
    })

  } catch (error) {
    console.error('Resend verification email error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to resend verification email' },
      { status: 500 }
    )
  }
}