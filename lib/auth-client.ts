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
  
  signOut: async () => {
    const supabase = createClient()
    return await supabase.auth.signOut()
  },
  
  getUser: async () => {
    const supabase = createClient()
    return await supabase.auth.getUser()
  },
  
  getSession: async () => {
    const supabase = createClient()
    return await supabase.auth.getSession()
  }
}
