import { NextRequest, NextResponse } from 'next/server'
import { authEmailService } from '@/lib/auth-email-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Test the email service configuration
    const configTest = await authEmailService.testEmailConfiguration()
    
    if (!configTest.success) {
      return NextResponse.json({
        success: false,
        error: 'Email service not configured properly',
        details: configTest.error
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Auth email service is configured and ready',
      config: {
        resendConfigured: !!process.env.RESEND_API_KEY,
        fromEmail: process.env.RESEND_FROM_EMAIL_AUTH || process.env.RESEND_FROM_EMAIL || 'registration@updates.flowvya.com',
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.flowvya.com'
      }
    })

  } catch (error) {
    console.error('Auth email service test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, fullName, includeToken } = body

    if (!email || !fullName) {
      return NextResponse.json(
        { success: false, error: 'Email and fullName are required' },
        { status: 400 }
      )
    }

    // Generate a test token if requested
    let verificationToken: string | undefined
    if (includeToken) {
      verificationToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    }

    // Send test welcome email
    const result = await authEmailService.sendWelcomeEmail({
      email: email,
      fullName: fullName,
      verificationToken: verificationToken,
      isOAuthUser: !includeToken, // OAuth users don't need verification
      tenantName: 'Test Tenant'
    })

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      testData: {
        email,
        fullName,
        hadToken: !!verificationToken,
        isOAuthUser: !includeToken
      }
    })

  } catch (error) {
    console.error('Test welcome email error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}