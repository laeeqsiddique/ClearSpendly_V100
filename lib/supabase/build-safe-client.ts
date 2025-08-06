// Build-safe Supabase client wrapper
import { createClient as originalCreateClient } from '@supabase/supabase-js'

// Build-time detection
const isBuildTime = process.env.NODE_ENV === 'production' && 
  process.env.BUILDING === 'true' && 
  !process.env.RAILWAY_ENVIRONMENT

// Mock client for build time
const mockClient = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
  },
  from: () => ({
    select: () => mockQuery(),
    insert: () => mockQuery(),
    update: () => mockQuery(),
    delete: () => mockQuery(),
    upsert: () => mockQuery(),
  }),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      download: async () => ({ data: null, error: null }),
      remove: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    })
  },
}

const mockQuery = () => ({
  eq: () => mockQuery(),
  neq: () => mockQuery(),
  gt: () => mockQuery(),
  gte: () => mockQuery(),
  lt: () => mockQuery(),
  lte: () => mockQuery(),
  like: () => mockQuery(),
  ilike: () => mockQuery(),
  order: () => mockQuery(),
  limit: () => mockQuery(),
  single: () => Promise.resolve({ data: null, error: null }),
  then: (resolve: any) => resolve({ data: null, error: null })
})

export function createClient(url?: string, key?: string) {
  // Return mock client during build time
  if (isBuildTime || !url || !key) {
    return mockClient as any
  }
  
  // Return real client during runtime
  return originalCreateClient(url, key)
}