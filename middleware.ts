import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /api/payments/webhooks is a webhook endpoint that should be accessible without authentication
  if (pathname.startsWith("/api/payments/webhooks")) {
    return NextResponse.next();
  }

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
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      // Check if user has a tenant
      try {
        const { data: membership } = await supabase
          .from('membership')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single()

        if (!membership) {
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
      } catch (error) {
        console.error('Error checking user tenant:', error)
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }
    
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in", "/sign-up", "/onboarding"],
};
