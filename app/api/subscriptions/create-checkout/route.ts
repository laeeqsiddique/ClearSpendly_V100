import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPolarCustomer, createCheckoutSession } from '@/lib/polar'
import { getUser } from '@/lib/auth'
import { getPrimaryTenant } from '@/lib/tenant'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await request.json()
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Get user's primary tenant
    const tenant = await getPrimaryTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const supabase = await createClient()

    // Check if tenant already has a Polar customer
    let polarCustomerId = tenant.polar_customer_id

    if (!polarCustomerId) {
      // Create Polar customer
      try {
        const polarCustomer = await createPolarCustomer(user.email!, user.user_metadata?.full_name)
        polarCustomerId = polarCustomer.id

        // Update tenant with Polar customer ID
        const { error: updateError } = await supabase
          .from('tenants')
          .update({ 
            polar_customer_id: polarCustomerId,
            updated_at: new Date().toISOString()
          })
          .eq('id', tenant.id)

        if (updateError) {
          console.error('Error updating tenant with Polar customer ID:', updateError)
          return NextResponse.json({ error: 'Failed to link customer' }, { status: 500 })
        }
      } catch (error) {
        console.error('Error creating Polar customer:', error)
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
      }
    }

    // Create checkout session
    try {
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3004' 
        : `https://${request.headers.get('host')}`
        
      const successUrl = `${baseUrl}/dashboard/admin?tab=billing&success=true`
      const cancelUrl = `${baseUrl}/dashboard/admin?tab=billing&canceled=true`

      const checkout = await createCheckoutSession(
        polarCustomerId,
        productId,
        successUrl,
        cancelUrl
      )

      return NextResponse.json({ 
        checkoutUrl: checkout.url,
        checkoutId: checkout.id 
      })
    } catch (error) {
      console.error('Error creating checkout session:', error)
      return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in create-checkout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}