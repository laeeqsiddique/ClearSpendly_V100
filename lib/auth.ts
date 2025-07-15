import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// Supabase Auth helper functions
export async function getUser() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    // Debug logging
    console.log('Auth check - User:', user?.id ? 'Authenticated' : 'Not authenticated')
    console.log('Auth check - Error:', error?.message || 'None')
    
    if (error) {
      // Don't log errors for unauthenticated users - this is normal
      if (error.message.includes('invalid_token') || error.message.includes('session_not_found')) {
        return null
      }
      console.error('Error getting user:', error.message)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Unexpected error in getUser:', error)
    return null
  }
}

export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('Error signing out:', error.message)
    return { error }
  }
  
  return { success: true }
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    console.error('Error signing in:', error.message)
    return { error }
  }
  
  return { data }
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  
  if (error) {
    console.error('Error signing up:', error.message)
    return { error }
  }
  
  return { data }
}

// TODO: Integrate Polar subscription webhooks with Supabase
// This will be implemented when we set up subscription management
