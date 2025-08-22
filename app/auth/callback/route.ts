import { createClient } from '@/lib/supabase/server'
import { createTenant, generateTenantSlug, isSlugAvailable } from '@/lib/tenant'
import { getAppUrl } from '@/lib/config/app-url'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  const returnTo = searchParams.get('returnTo') ?? '/dashboard'

  // Handle OAuth errors from the provider
  if (error) {
    console.error('OAuth provider error:', { error, error_description })
    
    // Map common OAuth errors to user-friendly messages
    let errorParam = 'oauth_error'
    if (error === 'access_denied') {
      errorParam = 'access_denied'
    } else if (error === 'unauthorized_client') {
      errorParam = 'config_error'
    } else if (error === 'invalid_client') {
      errorParam = 'config_error'
    } else if (error === 'redirect_uri_mismatch') {
      errorParam = 'config_error'
    } else if (error === 'invalid_request') {
      errorParam = 'oauth_error'
    } else if (error === 'unsupported_response_type') {
      errorParam = 'config_error'
    }
    
    return NextResponse.redirect(`${origin}/sign-in?error=${errorParam}`)
  }

  if (code) {
    const supabase = await createClient()
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        
        // Handle specific Supabase auth errors
        let errorParam = 'auth_failed'
        if (error.message.includes('invalid_code')) {
          errorParam = 'invalid_code'
        } else if (error.message.includes('expired')) {
          errorParam = 'code_expired'
        }
        
        return NextResponse.redirect(`${origin}/sign-in?error=${errorParam}`)
      }

      if (data.user) {
        // Check if user already has a tenant
        const { data: existingMembership } = await supabase
          .from('membership')
          .select('id')
          .eq('user_id', data.user.id)
          .single()

        if (!existingMembership) {
          // User needs a tenant - extract organization name from OAuth profile or create default
          let organizationName = data.user.user_metadata?.organization_name

          // Try to get organization name from Google profile data
          if (!organizationName && data.user.user_metadata?.full_name) {
            // Use full name as organization if available
            organizationName = `${data.user.user_metadata.full_name}'s Organization`
          } else if (!organizationName && data.user.user_metadata?.name) {
            // Fallback to name field
            organizationName = `${data.user.user_metadata.name}'s Organization`
          } else if (!organizationName) {
            // Final fallback using email
            const emailPrefix = data.user.email?.split('@')[0] || 'User'
            organizationName = `${emailPrefix}'s Organization`
          }
          
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
          console.log(`Creating tenant for OAuth user: ${organizationName} (${slug})`)
          const tenant = await createTenant(organizationName, slug)
          
          if (!tenant) {
            console.error('Failed to create tenant for OAuth user:', {
              userId: data.user.id,
              email: data.user.email,
              organizationName,
              slug
            })
            return NextResponse.redirect(`${origin}/sign-in?error=tenant_creation_failed`)
          }
          
          console.log('Successfully created tenant for OAuth user:', {
            tenantId: tenant.id,
            userId: data.user.id,
            organizationName,
            slug
          })
          
          // Store the organization name in user metadata if it wasn't there
          if (!data.user.user_metadata?.organization_name) {
            try {
              await supabase.auth.updateUser({
                data: {
                  organization_name: organizationName
                }
              })
            } catch (updateError) {
              console.error('Failed to update user metadata:', updateError)
            }
          }
          
          // Redirect new OAuth users to onboarding
          const appUrl = getAppUrl()
          return NextResponse.redirect(`${appUrl}/onboarding`)
        }

        // Redirect existing users to their destination
        const appUrl = getAppUrl()
        return NextResponse.redirect(`${appUrl}${returnTo}`)
      }
    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(`${origin}/sign-in?error=unexpected_error`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}