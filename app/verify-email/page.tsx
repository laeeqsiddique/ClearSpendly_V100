'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react'

function VerifyEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resend'>('loading')
  const [message, setMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()

  const token = searchParams.get('token')
  const returnTo = searchParams.get('returnTo')

  useEffect(() => {
    if (token) {
      // If we have a token, the API route will handle verification and redirect
      // This page is mainly for manual verification or error handling
      verifyEmailToken(token)
    } else {
      // No token provided, show resend form
      setStatus('resend')
      setMessage('No verification token provided.')
    }
  }, [token])

  const verifyEmailToken = async (verificationToken: string) => {
    try {
      const params = new URLSearchParams({
        token: verificationToken
      })
      
      if (returnTo) {
        params.append('returnTo', returnTo)
      }

      const response = await fetch(`/api/verify-email?${params.toString()}`)
      
      if (response.redirected) {
        // API redirected us, which means verification was successful
        window.location.href = response.url
        return
      }

      const data = await response.json()
      
      if (data.success) {
        setStatus('success')
        setMessage('Email verified successfully!')
        
        // Redirect after showing success message
        setTimeout(() => {
          router.push(returnTo || '/dashboard')
        }, 2000)
      } else {
        setStatus('error')
        setMessage(data.error || 'Verification failed')
      }
    } catch (error) {
      console.error('Verification error:', error)
      setStatus('error')
      setMessage('An error occurred during verification')
    }
  }

  const handleResendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!resendEmail.trim()) {
      setMessage('Please enter your email address')
      return
    }

    setStatus('loading')
    
    try {
      const response = await fetch('/api/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resendEmail }),
      })

      const data = await response.json()
      
      if (data.success) {
        setStatus('success')
        setMessage(data.message || 'Verification email sent successfully!')
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to send verification email')
      }
    } catch (error) {
      console.error('Resend email error:', error)
      setStatus('error')
      setMessage('An error occurred while sending the email')
    }
  }

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold mb-2">Verifying your email...</h2>
            <p className="text-gray-600">Please wait while we verify your email address.</p>
          </div>
        )

      case 'success':
        return (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h2 className="text-xl font-semibold mb-2 text-green-800">Email Verified!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            {!token && (
              <Alert className="mt-4">
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Check your email for the verification link and click it to complete the process.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )

      case 'error':
        return (
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
            <h2 className="text-xl font-semibold mb-2 text-red-800">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-4">
              <Button 
                onClick={() => setStatus('resend')} 
                variant="outline"
                className="w-full sm:w-auto"
              >
                Request New Verification Email
              </Button>
              <p className="text-sm text-gray-500">
                Or{' '}
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-blue-600"
                  onClick={() => router.push('/sign-in')}
                >
                  return to sign in
                </Button>
              </p>
            </div>
          </div>
        )

      case 'resend':
        return (
          <div className="py-8">
            <div className="text-center mb-6">
              <Mail className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <h2 className="text-xl font-semibold mb-2">Verify Your Email</h2>
              <p className="text-gray-600">
                Enter your email address to receive a new verification link.
              </p>
            </div>

            <form onSubmit={handleResendEmail} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email address"
                  required
                />
              </div>
              
              <Button type="submit" className="w-full">
                Send Verification Email
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Already verified?{' '}
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-blue-600"
                  onClick={() => router.push('/sign-in')}
                >
                  Sign in to your account
                </Button>
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold text-gray-900">FlowVya</h1>
          <p className="mt-2 text-sm text-gray-600">Smart expense management</p>
        </div>

        {/* Main Content Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Email Verification</CardTitle>
            <CardDescription>
              Verify your email address to secure your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Having trouble? Contact us at{' '}
            <a href="mailto:support@flowvya.com" className="text-blue-600 hover:text-blue-500">
              support@flowvya.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}