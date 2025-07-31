# Deployment-Safe Coding Guidelines

## 🎯 Overview
These guidelines ensure code is deployment-ready and prevents build failures on production platforms like Railway, Vercel, and other hosting providers.

## 🚨 Critical Rules - NEVER BREAK THESE

### 1. Environment Variable Safety
```typescript
// ❌ NEVER - Unsafe non-null assertions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,  // Will crash if undefined
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ✅ ALWAYS - Safe with fallbacks
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// ✅ BETTER - Build-time detection with mock clients
function createClient() {
  const isBuildTime = process.env.NODE_ENV === 'production' && 
    !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT;
    
  if (isBuildTime || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return createMockClient();
  }
  
  return createSupabaseClient(/* ... */);
}
```

### 2. Static Generation Protection
```typescript
// ❌ NEVER - Server operations during static generation
export default async function Page() {
  const data = await supabase.from('table').select(); // Will fail during build
  return <div>{data}</div>;
}

// ✅ ALWAYS - Use dynamic rendering for database operations
export const dynamic = 'force-dynamic';
export default function Page() {
  // Safe for client-side data fetching
}

// ✅ BETTER - Build-time detection
export default function Page() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Only run on client-side
      fetchData();
    }
  }, []);
}
```

### 3. Dynamic Import Safety
```typescript
// ❌ RISKY - May fail during build
const Component = dynamic(() => import('./component'));

// ✅ SAFE - With error handling
const Component = dynamic(
  () => import('./component').catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null }
);

// ✅ BETTER - Conditional rendering
const Component = dynamic(() => import('./component'), {
  ssr: false,
  loading: () => null
});

export default function Page() {
  return (
    <div>
      {typeof window !== 'undefined' && <Component />}
    </div>
  );
}
```

### 4. Middleware Build Protection
```typescript
// ✅ ALWAYS - Build-time detection in middleware
export async function middleware(request: NextRequest) {
  // Critical: Check for build environment
  const isBuildTime = process.env.NODE_ENV === 'production' && (
    process.env.CI === 'true' || 
    !process.env.RAILWAY_ENVIRONMENT ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL
  );

  if (isBuildTime) {
    return NextResponse.next();
  }

  // Safe to proceed with database operations
  try {
    const response = await updateSession(request);
    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next(); // Always provide fallback
  }
}
```

## 🛡️ Defensive Programming Patterns

### 1. Mock Client Pattern
```typescript
function createMockClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
      // ... other auth methods
    },
    from: () => ({
      select: () => mockQuery(),
      insert: () => mockQuery(),
      // ... other query methods
    })
  };
}

const mockQuery = () => ({
  eq: () => mockQuery(),
  single: () => Promise.resolve({ data: null, error: new Error('Service unavailable') }),
  then: (resolve: any) => resolve({ data: null, error: new Error('Service unavailable') })
});
```

### 2. Build Environment Detection
```typescript
// Centralized build detection
export const isBuildTime = () => {
  return process.env.NODE_ENV === 'production' && (
    typeof window === 'undefined' &&
    !process.env.VERCEL &&
    !process.env.RAILWAY_ENVIRONMENT
  );
};

export const isClientSide = () => typeof window !== 'undefined';

// Usage
if (isBuildTime()) {
  return mockResponse;
}
```

### 3. Graceful Service Degradation
```typescript
export async function getUser() {
  try {
    if (isBuildTime()) {
      return null;
    }
    
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.warn('Auth service unavailable:', error.message);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Unexpected auth error:', error);
    return null; // Always return safely
  }
}
```

## 📋 Pre-Deployment Checklist

### Before Every Commit:
- [ ] No unsafe non-null assertions (`!`) on environment variables
- [ ] All database operations have build-time protection
- [ ] Dynamic imports have error handling
- [ ] Client-side code is properly guarded with `typeof window !== 'undefined'`
- [ ] All external services (Supabase, Stripe, etc.) have mock fallbacks

### Before Deployment:
- [ ] Run `npm run build` locally and verify it completes
- [ ] Check for any `Error occurred prerendering page` messages
- [ ] Verify all environment variables are set in production
- [ ] Test with missing environment variables to ensure graceful degradation

## 🔧 Automated Enforcement

### 1. ESLint Rules
Add to `.eslintrc.json`:
```json
{
  "rules": {
    "@typescript-eslint/no-non-null-assertion": "error",
    "no-process-env": "warn"
  }
}
```

### 2. Pre-commit Hook
Create `.husky/pre-commit`:
```bash
#!/bin/sh
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed - fix errors before committing"
  exit 1
fi
echo "✅ Build successful"
```

### 3. Build Validation Script
Create `scripts/validate-build.js`:
```javascript
const { exec } = require('child_process');

// Remove environment variables temporarily
const originalEnvs = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
};

// Unset env vars to test build resilience
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

exec('npm run build', (error, stdout, stderr) => {
  // Restore environment variables
  Object.assign(process.env, originalEnvs);
  
  if (error) {
    console.error('❌ Build failed without environment variables');
    console.error(stderr);
    process.exit(1);
  }
  
  console.log('✅ Build successful without environment variables');
});
```

## 🚀 Next.js Configuration

### Required next.config.ts settings:
```typescript
const nextConfig: NextConfig = {
  // Prevent build failures
  typescript: {
    ignoreBuildErrors: false, // Don't ignore - fix the errors
  },
  eslint: {
    ignoreDuringBuilds: false, // Don't ignore - fix the errors
  },
  
  // Environment variable detection
  env: {
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
    IS_BUILD_TIME: process.env.NODE_ENV === 'production' && 
      !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT ? 'true' : 'false',
  },
  
  // Server-side externals
  serverExternalPackages: [
    '@polar-sh/sdk', 
    'tesseract.js', 
    'pdfjs-dist'
  ],
  
  // Production optimizations
  output: 'standalone',
  compress: true,
};
```

## 🎯 Common Anti-Patterns to Avoid

### 1. Database Calls in Static Components
```typescript
// ❌ NEVER
export default async function StaticPage() {
  const data = await db.select(); // Will fail during build
  return <div>{data}</div>;
}

// ✅ ALWAYS
export const dynamic = 'force-dynamic';
export default function DynamicPage() {
  // Use useEffect or server actions for data fetching
}
```

### 2. Unguarded Client-Side APIs
```typescript
// ❌ NEVER
const result = window.localStorage.getItem('key'); // Will fail on server

// ✅ ALWAYS
const result = typeof window !== 'undefined' 
  ? window.localStorage.getItem('key') 
  : null;
```

### 3. Missing Error Boundaries
```typescript
// ✅ ALWAYS wrap risky components
export default function Page() {
  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <RiskyComponent />
    </ErrorBoundary>
  );
}
```

## 📊 Success Metrics

### Build Health Indicators:
- ✅ `npm run build` completes in under 5 minutes
- ✅ No "Error occurred prerendering page" messages
- ✅ All pages generate successfully (X/X completed)
- ✅ Build works with and without environment variables
- ✅ No TypeScript errors in production build
- ✅ Container starts in under 2 minutes

### Deployment Stability:
- ✅ Zero deployment failures due to build errors
- ✅ Graceful degradation when services are unavailable
- ✅ Fast recovery from environment variable issues
- ✅ Consistent behavior across different hosting platforms

---

**Remember: A successful deployment is one that works even when things go wrong. Always code defensively and assume external services may be unavailable.**