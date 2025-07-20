import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getPrimaryTenant } from '@/lib/tenant'
import { getSubscriptionDetails } from '@/lib/subscription'

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's primary tenant
    const tenant = await getPrimaryTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    // Get subscription details
    const subscriptionDetails = await getSubscriptionDetails()

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subscription_status: tenant.subscription_status,
        receipts_limit: tenant.receipts_limit,
        storage_limit_gb: tenant.storage_limit_gb,
        polar_customer_id: tenant.polar_customer_id,
        polar_subscription_id: tenant.polar_subscription_id,
      },
      subscription: subscriptionDetails
    })
  } catch (error) {
    console.error('Error getting subscription status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}