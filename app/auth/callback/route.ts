import { createClient } from '@/lib/supabase/server'
import { createTenant, generateTenantSlug, isSlugAvailable } from '@/lib/tenant'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const returnTo = searchParams.get('returnTo') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`)
      }

      if (data.user) {
        // Check if user already has a tenant
        const { data: existingMembership } = await supabase
          .from('membership')
          .select('id')
          .eq('user_id', data.user.id)
          .single()

        if (!existingMembership) {
          // User needs a tenant - check for organization name or create default
          const organizationName = data.user.user_metadata?.organization_name || 
                                  `${data.user.email?.split('@')[0] || 'User'}'s Organization`
        
        if (organizationName) {
          // Generate a unique slug for the organization
          let baseSlug = generateTenantSlug(organizationName)
          let slug = baseSlug
          let counter = 1
          
          // Ensure slug is unique
          while (!(await isSlugAvailable(slug))) {
            slug = `${baseSlug}-${counter}`
            counter++
          }
          
          // Create tenant for new user
          const tenant = await createTenant(organizationName, slug)
          
          if (!tenant) {
            console.error('Failed to create tenant for new user')
            return NextResponse.redirect(`${origin}/sign-in?error=tenant_creation_failed`)
          }
          
          console.log('Created tenant for new user:', tenant.id)
          
          // Redirect new users to onboarding
          const forwardedHost = request.headers.get('x-forwarded-host')
          const isLocalEnv = process.env.NODE_ENV === 'development'
          const isRailway = process.env.RAILWAY_ENVIRONMENT
          
          if (isLocalEnv) {
            return NextResponse.redirect(`http://localhost:3000/onboarding`)
          } else if (isRailway && forwardedHost) {
            return NextResponse.redirect(`https://${forwardedHost}/onboarding`)
          } else if (isRailway) {
            // Use Railway's public URL or fallback to www.flowvya.com
            return NextResponse.redirect(`https://www.flowvya.com/onboarding`)
          } else {
            return NextResponse.redirect(`${origin}/onboarding`)
          }
        }
        }

        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'
        const isRailway = process.env.RAILWAY_ENVIRONMENT
        
        if (isLocalEnv) {
          // In development, redirect to localhost
          return NextResponse.redirect(`http://localhost:3000${returnTo}`)
        } else if (isRailway && forwardedHost) {
          // In Railway production, use the forwarded host
          return NextResponse.redirect(`https://${forwardedHost}${returnTo}`)
        } else if (isRailway) {
          // Use Railway's public URL or fallback to www.flowvya.com
          return NextResponse.redirect(`https://www.flowvya.com${returnTo}`)
        } else {
          // Fallback to origin
          return NextResponse.redirect(`${origin}${returnTo}`)
        }
      }
    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(`${origin}/sign-in?error=unexpected_error`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}