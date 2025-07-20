import { NextRequest, NextResponse } from 'next/server'
import { getCustomerPortalUrl } from '@/lib/polar'
import { getUser } from '@/lib/auth'
import { getPrimaryTenant } from '@/lib/tenant'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's primary tenant
    const tenant = await getPrimaryTenant()
    if (!tenant?.polar_customer_id) {
      return NextResponse.json({ error: 'No customer ID found' }, { status: 404 })
    }

    // Get customer portal URL
    try {
      const portalUrl = await getCustomerPortalUrl(tenant.polar_customer_id)
      
      if (!portalUrl) {
        return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
      }

      return NextResponse.json({ url: portalUrl })
    } catch (error) {
      console.error('Error creating customer portal URL:', error)
      return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in customer-portal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}