'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// Force dynamic rendering - this page cannot be statically generated
export const dynamic = 'force-dynamic'

function OAuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')
      const error_description = searchParams.get('error_description')
      
      console.log('=== OAuth Callback Debug ===')
      console.log('Code:', !!code)
      console.log('Error:', error)
      console.log('Error Description:', error_description)
      console.log('Full URL:', window.location.href)
      console.log('Search Params:', Object.fromEntries(searchParams.entries()))
      console.log('========================')
      
      const productionUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flowvya.com'
      
      if (error) {
        console.error('OAuth error received:', { error, error_description })
        
        // Show detailed error to user
        const errorMessage = error_description 
          ? `${error}: ${error_description}` 
          : error
          
        toast.error(`Authentication failed: ${errorMessage}`, { duration: 10000 })
        
        // If it's a database error, this is a Supabase issue, not our code
        if (error === 'server_error' && error_description?.includes('Database error')) {
          toast.error('Database configuration issue - please contact support', { duration: 15000 })
        }
        
        setTimeout(() => {
          router.push(`/sign-in?error=${error}`)
        }, 3000)
        return
      }
      
      if (code) {
        try {
          const supabase = createClient()
          console.log('Attempting to exchange code for session...')
          
          toast.info('Completing authentication...', { duration: 5000 })
          
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('Session exchange error:', error)
            toast.error(`Authentication failed: ${error.message}`, { duration: 10000 })
            router.push('/sign-in?error=auth_failed')
            return
          }
          
          if (data.user) {
            console.log('User authenticated successfully:', data.user.email)
            toast.success('Authentication successful! Redirecting...', { duration: 3000 })
            
            // Redirect to onboarding
            setTimeout(() => {
              router.push('/onboarding')
            }, 1500)
            return
          }
        } catch (error) {
          console.error('Unexpected callback error:', error)
          toast.error('Authentication failed due to unexpected error', { duration: 10000 })
          router.push('/sign-in?error=unexpected_error')
        }
      } else {
        console.log('No code provided in callback')
        toast.error('No authentication code received')
        router.push('/sign-in?error=no_code')
      }
    }
    
    handleCallback()
  }, [searchParams, router])
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Processing Authentication</h2>
        <p className="text-gray-600">Please wait while we complete your sign-in...</p>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>If this takes too long, you can</p>
          <button 
            onClick={() => window.location.href = '/sign-in'}
            className="text-purple-600 hover:underline"
          >
            return to sign in
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OAuthCallback() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading...</h2>
          <p className="text-gray-600">Preparing authentication...</p>
        </div>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  )
}