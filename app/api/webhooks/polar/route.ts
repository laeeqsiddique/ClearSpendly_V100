import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyWebhookSignature, PolarWebhookEvent, POLAR_STATUS_MAP } from '@/lib/polar'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('polar-signature')
    
    if (!signature) {
      console.error('Missing Polar signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(
      body,
      signature,
      process.env.POLAR_WEBHOOK_SECRET!
    )

    if (!isValid) {
      console.error('Invalid Polar webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event: PolarWebhookEvent = JSON.parse(body)
    console.log('Received Polar webhook:', event.type, event.data.id)

    const supabase = await createClient()

    switch (event.type) {
      case 'subscription.created':
      case 'subscription.updated':
        await handleSubscriptionUpdate(supabase, event)
        break
        
      case 'subscription.canceled':
        await handleSubscriptionCanceled(supabase, event)
        break
        
      case 'customer.created':
        await handleCustomerCreated(supabase, event)
        break
        
      case 'customer.updated':
        await handleCustomerUpdated(supabase, event)
        break
        
      default:
        console.log('Unhandled Polar webhook event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing Polar webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionUpdate(supabase: any, event: PolarWebhookEvent) {
  const subscription = event.data
  
  try {
    // Find tenant by Polar customer ID
    const { data: tenant, error: findError } = await supabase
      .from('tenants')
      .select('id')
      .eq('polar_customer_id', subscription.customer_id)
      .single()

    if (findError || !tenant) {
      console.error('Tenant not found for customer:', subscription.customer_id)
      return
    }

    // Determine subscription plan and limits
    const isProSubscription = subscription.status === 'active'
    const subscriptionStatus = POLAR_STATUS_MAP[subscription.status as keyof typeof POLAR_STATUS_MAP] || 'inactive'
    
    // Update tenant subscription details
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        polar_subscription_id: subscription.id,
        subscription_status: subscriptionStatus,
        subscription_current_period_end: subscription.current_period_end,
        receipts_limit: isProSubscription ? -1 : 10, // -1 = unlimited
        storage_limit_gb: isProSubscription ? 100 : 10,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenant.id)

    if (updateError) {
      console.error('Error updating tenant subscription:', updateError)
      return
    }

    console.log(`Updated tenant ${tenant.id} subscription:`, {
      status: subscriptionStatus,
      receipts_limit: isProSubscription ? 'unlimited' : 10
    })
  } catch (error) {
    console.error('Error handling subscription update:', error)
  }
}

async function handleSubscriptionCanceled(supabase: any, event: PolarWebhookEvent) {
  const subscription = event.data
  
  try {
    // Find tenant by subscription ID
    const { data: tenant, error: findError } = await supabase
      .from('tenants')
      .select('id')
      .eq('polar_subscription_id', subscription.id)
      .single()

    if (findError || !tenant) {
      console.error('Tenant not found for subscription:', subscription.id)
      return
    }

    // Revert to free tier
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        subscription_status: 'canceled',
        receipts_limit: 10,
        storage_limit_gb: 10,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenant.id)

    if (updateError) {
      console.error('Error updating canceled subscription:', updateError)
      return
    }

    console.log(`Canceled subscription for tenant ${tenant.id}`)
  } catch (error) {
    console.error('Error handling subscription cancellation:', error)
  }
}

async function handleCustomerCreated(supabase: any, event: PolarWebhookEvent) {
  const customer = event.data
  
  try {
    // Find tenant by customer email
    const { data: users, error: findError } = await supabase
      .from('users')
      .select(`
        id,
        memberships!inner (
          tenant_id,
          role
        )
      `)
      .eq('email', customer.email)
      .eq('memberships.role', 'owner')

    if (findError || !users || users.length === 0) {
      console.log('No tenant owner found for customer email:', customer.email)
      return
    }

    // Update the tenant with Polar customer ID
    const tenantId = users[0].memberships[0].tenant_id
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        polar_customer_id: customer.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId)

    if (updateError) {
      console.error('Error updating tenant with customer ID:', updateError)
      return
    }

    console.log(`Linked Polar customer ${customer.id} to tenant ${tenantId}`)
  } catch (error) {
    console.error('Error handling customer creation:', error)
  }
}

async function handleCustomerUpdated(supabase: any, event: PolarWebhookEvent) {
  // Handle customer updates if needed
  console.log('Customer updated:', event.data.id)
}