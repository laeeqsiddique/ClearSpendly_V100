'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')
      const error_description = searchParams.get('error_description')
      
      console.log('Auth callback page called:', { code: !!code, error, error_description })
      
      const productionUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flowvya.com'
      
      if (error) {
        console.error('OAuth error:', { error, error_description })
        toast.error(`OAuth error: ${error_description || error}`)
        router.push(`/sign-in?error=${error}`)
        return
      }
      
      if (code) {
        try {
          const supabase = createClient()
          console.log('Exchanging code for session...')
          
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('Session exchange error:', error)
            toast.error(`Authentication failed: ${error.message}`)
            router.push('/sign-in?error=auth_failed')
            return
          }
          
          if (data.user) {
            console.log('User authenticated:', data.user.email)
            toast.success('Authentication successful!')
            router.push('/onboarding')
            return
          }
        } catch (error) {
          console.error('Unexpected callback error:', error)
          toast.error('Authentication failed')
          router.push('/sign-in?error=unexpected_error')
        }
      } else {
        console.log('No code provided')
        router.push('/sign-in?error=no_code')
      }
    }
    
    handleCallback()
  }, [searchParams, router])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  )
}