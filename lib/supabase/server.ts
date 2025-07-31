import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT && process.env.CI === 'true'

export async function createClient() {
  // During build time, return a mock client to prevent errors
  if (isBuildTime || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return createMockClient()
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

function createMockClient() {
  const mockAuth = {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not available') }),
    signUp: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not available') }),
    signInWithOAuth: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not available') }),
    updateUser: async () => ({ data: { user: null }, error: new Error('Supabase not available') }),
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
    single: () => Promise.resolve({ data: null, error: new Error('Supabase not available') }),
    maybeSingle: () => Promise.resolve({ data: null, error: new Error('Supabase not available') }),
    then: (resolve: any) => resolve({ data: null, error: new Error('Supabase not available') })
  })

  return {
    auth: mockAuth,
    from: mockFrom,
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: new Error('Supabase not available') }),
        download: async () => ({ data: null, error: new Error('Supabase not available') }),
        remove: async () => ({ data: null, error: new Error('Supabase not available') }),
        list: async () => ({ data: null, error: new Error('Supabase not available') }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    },
    functions: {
      invoke: async () => ({ data: null, error: new Error('Supabase not available') })
    },
    rpc: async () => ({ data: null, error: new Error('Supabase not available') })
  }
}