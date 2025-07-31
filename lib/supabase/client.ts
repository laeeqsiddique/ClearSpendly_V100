import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/config/env'

// Only use mock client during actual build process, not in production runtime
const isBuildTime = typeof window === 'undefined' && 
  process.env.NODE_ENV === 'production' && 
  process.env.BUILDING === 'true'

export function createClient() {
  // Railway fix: Use hardcoded fallbacks if env vars not available
  const RAILWAY_FALLBACK_URL = 'https://chuhbgcwjjldivnwyvia.supabase.co'
  const RAILWAY_FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNodWhiZ2N3ampsZGl2bnd5dmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MTY2MzYsImV4cCI6MjA2ODA5MjYzNn0.naZU_NBUTyY_DgUOhFaYjzcqLj6dZ3uYAqm29uZZGfg'
  
  // Use environment variables with Railway fallbacks
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || RAILWAY_FALLBACK_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || RAILWAY_FALLBACK_KEY
  
  // Enhanced debug logging for Railway deployment
  if (typeof window !== 'undefined') {
    console.log('Supabase Client Debug:', {
      hasEnvUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasEnvKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      usingFallback: !process.env.NEXT_PUBLIC_SUPABASE_URL,
      urlPrefix: supabaseUrl?.substring(0, 30),
      isRailway: !!process.env.RAILWAY_ENVIRONMENT,
      nodeEnv: process.env.NODE_ENV,
    })
  }
  
  // Only use mock during actual build process
  if (isBuildTime) {
    console.log('Using mock client for build process')
    return createMockClient()
  }
  
  // Always return real client with fallbacks - Railway fix
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

function createMockClient() {
  // Create error objects that don't trigger unnecessary warnings
  const createSilentError = (message: string) => ({
    message,
    code: 'MOCK_CLIENT_ERROR',
    details: 'Service unavailable - using mock client',
    hint: null
  });

  const mockAuth = {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ 
      data: { user: null, session: null }, 
      error: createSilentError('Authentication service unavailable') 
    }),
    signUp: async () => ({ 
      data: { user: null, session: null }, 
      error: createSilentError('Authentication service unavailable') 
    }),
    signInWithOAuth: async () => ({ 
      data: { user: null, session: null }, 
      error: createSilentError('OAuth service unavailable') 
    }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  }

  const mockFrom = () => ({
    select: () => mockFrom(),
    insert: () => mockFrom(),
    update: () => mockFrom(),
    delete: () => mockFrom(),
    upsert: () => mockFrom(),
    eq: () => mockFrom(),
    neq: () => mockFrom(),
    gt: () => mockFrom(),
    gte: () => mockFrom(),
    lt: () => mockFrom(),
    lte: () => mockFrom(),
    like: () => mockFrom(),
    ilike: () => mockFrom(),
    is: () => mockFrom(),
    in: () => mockFrom(),
    contains: () => mockFrom(),
    containedBy: () => mockFrom(),
    rangeGt: () => mockFrom(),
    rangeGte: () => mockFrom(),
    rangeLt: () => mockFrom(),
    rangeLte: () => mockFrom(),
    rangeAdjacent: () => mockFrom(),
    overlaps: () => mockFrom(),
    textSearch: () => mockFrom(),
    match: () => mockFrom(),
    not: () => mockFrom(),
    or: () => mockFrom(),
    filter: () => mockFrom(),
    order: () => mockFrom(),
    limit: () => mockFrom(),
    range: () => mockFrom(),
    abortSignal: () => mockFrom(),
    single: () => Promise.resolve({ data: null, error: createSilentError('Database service unavailable') }),
    maybeSingle: () => Promise.resolve({ data: null, error: createSilentError('Database service unavailable') }),
    then: (resolve: any) => resolve({ data: null, error: createSilentError('Database service unavailable') })
  })

  return {
    auth: mockAuth,
    from: mockFrom,
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: createSilentError('Storage service unavailable') }),
        download: async () => ({ data: null, error: createSilentError('Storage service unavailable') }),
        remove: async () => ({ data: null, error: createSilentError('Storage service unavailable') }),
        list: async () => ({ data: null, error: createSilentError('Storage service unavailable') }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    },
    functions: {
      invoke: async () => ({ data: null, error: createSilentError('Functions service unavailable') })
    },
    rpc: async () => ({ data: null, error: createSilentError('RPC service unavailable') })
  }
}