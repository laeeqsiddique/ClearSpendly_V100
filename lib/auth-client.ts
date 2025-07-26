import { createClient } from '@/lib/supabase/client'

export const authClient = {
  // Supabase client for browser-side auth operations
  supabase: createClient(),
  
  // Helper methods for client-side auth
  signIn: async (email: string, password: string) => {
    const supabase = createClient()
    return await supabase.auth.signInWithPassword({ email, password })
  },
  
  signUp: async (email: string, password: string) => {
    const supabase = createClient()
    return await supabase.auth.signUp({ email, password })
  },
  
  signOut: async (options?: { fetchOptions?: { onSuccess?: () => void } }) => {
    const supabase = createClient()
    const result = await supabase.auth.signOut()
    
    // Call onSuccess callback if provided and signOut was successful
    if (!result.error && options?.fetchOptions?.onSuccess) {
      options.fetchOptions.onSuccess()
    }
    
    return result
  },
  
  getUser: async () => {
    const supabase = createClient()
    return await supabase.auth.getUser()
  },
  
  getSession: async () => {
    const supabase = createClient()
    const result = await supabase.auth.getSession()
    
    // Transform to match expected format - add user data if session exists
    if (result.data?.session?.user) {
      const user = result.data.session.user
      return {
        data: {
          user: {
            id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            image: user.user_metadata?.avatar_url || null,
            emailVerified: !!user.email_confirmed_at,
            createdAt: new Date(user.created_at),
            updatedAt: new Date(user.updated_at)
          }
        }
      }
    }
    
    return { data: { user: null } }
  }
}
