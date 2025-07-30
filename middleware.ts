import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from '@supabase/ssr';

// With bulletproof RLS policies, expected error codes:
// - PGRST116: No rows found (user has no membership)
// - Any other error code indicates an unexpected system issue

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Railway-specific: Skip middleware during build/static generation
  if (process.env.NODE_ENV === 'production' && process.env.CI === 'true') {
    return NextResponse.next();
  }

  // Skip middleware for static assets, API routes that don't need auth, and build files
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/payments/webhooks') ||
    pathname.startsWith('/api/health') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Railway-specific: Prevent database queries during static generation
  try {
    // Update session and get user
    const response = await updateSession(request);
  
    // For authentication routes, redirect to dashboard if already logged in
    if (["/sign-in", "/sign-up"].includes(pathname)) {
    // Check if user is authenticated after session update
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value)
            })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // User is authenticated, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    return response;
  }

  // For protected routes, check authentication and tenant access
  if (pathname.startsWith("/dashboard") || pathname === "/onboarding") {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value)
            })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // User not authenticated, redirect to sign-in
      const url = new URL('/sign-in', request.url)
      url.searchParams.set('returnTo', pathname)
      return NextResponse.redirect(url)
    }

    // For dashboard routes, check if user has completed onboarding and has a tenant
    if (pathname.startsWith("/dashboard")) {
      const onboardingCompleted = user.user_metadata?.onboarding_completed
      
      if (!onboardingCompleted) {
        console.log('Onboarding not completed, redirecting to onboarding')
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      // Check if user has a tenant membership
      // With bulletproof RLS policies, this query will work reliably
      const { data: membership, error: membershipError } = await supabase
        .from('membership')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .single()

      if (membershipError) {
        // With fixed RLS policies, we should only see PGRST116 (not found) errors
        // No more 42P17 infinite recursion or 42501 RLS policy errors
        if (membershipError.code === 'PGRST116') {
          // No membership found - user needs to complete onboarding
          console.log('No membership found for user, redirecting to onboarding')
          
          // Clear onboarding_completed flag since membership doesn't exist
          if (onboardingCompleted) {
            console.log('Clearing onboarding_completed flag due to missing membership')
            await supabase.auth.updateUser({
              data: { onboarding_completed: false }
            })
          }
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
        
        // Any other error is unexpected with bulletproof RLS - log and allow access
        console.error('Unexpected membership query error:', membershipError.code, membershipError.message)
        console.log('Allowing dashboard access despite membership query error')
        return response
      }

      if (!membership || !membership.tenant_id) {
        // This shouldn't happen with proper RLS, but handle gracefully
        console.log('Membership query succeeded but returned invalid data')
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      
      console.log('User has valid membership:', membership.tenant_id, 'role:', membership.role)
    }
    
    // For onboarding route, check if user already has completed setup
    if (pathname === "/onboarding") {
      const onboardingCompleted = user.user_metadata?.onboarding_completed
      
      // If onboarding is already completed and user has membership, redirect to dashboard
      if (onboardingCompleted) {
        const { data: membership, error: membershipError } = await supabase
          .from('membership')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single()

        // With bulletproof RLS, we only expect PGRST116 (not found) or success
        if (!membershipError && membership && membership.tenant_id) {
          console.log('User already has completed onboarding and has membership, redirecting to dashboard')
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
        
        // If membership not found, allow access to onboarding to fix the issue
        if (membershipError?.code === 'PGRST116') {
          console.log('Onboarding completed but no membership found, allowing onboarding access to fix')
        }
      }
    }
    
    return response;
  }

  // Railway-specific: Catch any errors during middleware execution
  } catch (error) {
    console.error('Middleware error (likely during build/static generation):', error);
    // Return next response to prevent build failures
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in", "/sign-up", "/onboarding"],
};
