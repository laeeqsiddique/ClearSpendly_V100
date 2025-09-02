import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyWebhookSignature, PolarWebhookEvent, POLAR_STATUS_MAP } from '@/lib/polar'
import { polarSubscriptionService } from '@/lib/services/polar-subscription-service'
import { featureGateService } from '@/lib/feature-gating/feature-gate-service'

export const dynamic = 'force-dynamic'

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
      process.env.POLAR_WEBHOOK_SECRET || ''
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
        await handleSubscriptionCreated(supabase, event)
        break
        
      case 'subscription.updated':
        await handleSubscriptionUpdated(supabase, event)
        break
        
      case 'subscription.canceled':
      case 'subscription.cancelled':
        await handleSubscriptionCanceled(supabase, event)
        break
        
      case 'subscription.reactivated':
        await handleSubscriptionReactivated(supabase, event)
        break
        
      case 'checkout.completed':
        await handleCheckoutCompleted(supabase, event)
        break
        
      case 'customer.created':
        await handleCustomerCreated(supabase, event)
        break
        
      case 'customer.updated':
        await handleCustomerUpdated(supabase, event)
        break
        
      case 'invoice.created':
      case 'invoice.paid':
      case 'invoice.payment_failed':
        await handleInvoiceEvent(supabase, event)
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

async function handleSubscriptionCreated(supabase: any, event: PolarWebhookEvent) {
  console.log('Handling subscription created:', event.data.id)
  
  try {
    const subscription = event.data
    
    // Find tenant by Polar customer ID
    const { data: tenant, error: findError } = await supabase
      .from('tenant')
      .select('id')
      .eq('polar_customer_id', subscription.customer_id)
      .single()

    if (findError || !tenant) {
      console.error('Tenant not found for customer:', subscription.customer_id)
      return
    }

    // Check if there's an existing trial that should be converted
    const { data: existingTrial } = await supabase
      .from('subscription')
      .select('id, status, trial_end')
      .eq('tenant_id', tenant.id)
      .eq('status', 'trialing')
      .single()
    
    if (existingTrial) {
      // Mark trial as converted before creating new subscription
      await supabase
        .from('subscription')
        .update({
          status: 'converted',
          converted_at: new Date().toISOString(),
          converted_to_subscription_id: subscription.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTrial.id)
      
      console.log(`Converting trial ${existingTrial.id} to paid subscription ${subscription.id}`)
    }

    await polarSubscriptionService.handleCheckoutSuccess(subscription.id, tenant.id)
    
    // Clear feature cache for this tenant
    featureGateService.clearCache(tenant.id)
    
    // Log subscription creation with trial context
    try {
      const { data: newSub } = await supabase
        .from('subscription')
        .select('id')
        .eq('polar_subscription_id', subscription.id)
        .single()
      
      if (newSub) {
        await supabase
          .from('subscription_event')
          .insert({
            subscription_id: newSub.id,
            tenant_id: tenant.id,
            event_type: existingTrial ? 'subscription_created_from_trial' : 'subscription_created',
            event_source: 'webhook',
            new_status: 'active',
            event_data: {
              polar_subscription_id: subscription.id,
              polar_customer_id: subscription.customer_id,
              converted_from_trial: !!existingTrial,
              trial_subscription_id: existingTrial?.id || null
            }
          })
      }
    } catch (eventError) {
      console.warn('Failed to log subscription creation event:', eventError)
    }
    
    console.log(`Subscription created for tenant ${tenant.id}:`, subscription.id)
  } catch (error) {
    console.error('Error handling subscription created:', error)
  }
}

async function handleSubscriptionUpdated(supabase: any, event: PolarWebhookEvent) {
  console.log('Handling subscription updated:', event.data.id)
  
  try {
    const subscription = event.data
    
    // Find existing subscription record
    const { data: existingSub, error: findError } = await supabase
      .from('subscription')
      .select('id, tenant_id, status as old_status')
      .eq('polar_subscription_id', subscription.id)
      .single()

    if (findError || !existingSub) {
      console.error('Subscription not found:', subscription.id)
      return
    }

    // Map Polar status to our status
    const mappedStatus = POLAR_STATUS_MAP[subscription.status as keyof typeof POLAR_STATUS_MAP] || subscription.status
    
    // Prepare update data
    const updateData: any = {
      status: mappedStatus,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      amount: subscription.price?.amount ? subscription.price.amount / 100 : 0,
      currency: subscription.price?.currency || 'USD',
      updated_at: new Date().toISOString()
    }

    // Handle trial ending
    if (existingSub.old_status === 'trialing' && mappedStatus === 'active') {
      updateData.trial_ended_at = new Date().toISOString()
    }

    // Handle cancellation
    if (mappedStatus === 'cancelled' && existingSub.old_status !== 'cancelled') {
      updateData.cancelled_at = new Date().toISOString()
      updateData.ended_at = subscription.ended_at || new Date().toISOString()
    }
    
    // Update subscription record
    const { error: updateError } = await supabase
      .from('subscription')
      .update(updateData)
      .eq('id', existingSub.id)

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return
    }

    // Log status change if significant
    if (existingSub.old_status !== mappedStatus) {
      try {
        let eventType = 'subscription_updated'
        
        if (existingSub.old_status === 'trialing' && mappedStatus === 'active') {
          eventType = 'trial_ended_converted'
        } else if (mappedStatus === 'cancelled') {
          eventType = 'subscription_cancelled'
        } else if (mappedStatus === 'active' && existingSub.old_status === 'past_due') {
          eventType = 'subscription_reactivated'
        }
        
        await supabase
          .from('subscription_event')
          .insert({
            subscription_id: existingSub.id,
            tenant_id: existingSub.tenant_id,
            event_type: eventType,
            event_source: 'webhook',
            previous_status: existingSub.old_status,
            new_status: mappedStatus,
            event_data: {
              polar_subscription_id: subscription.id,
              polar_status: subscription.status,
              period_start: subscription.current_period_start,
              period_end: subscription.current_period_end,
              amount: updateData.amount
            }
          })
      } catch (eventError) {
        console.warn('Failed to log subscription update event:', eventError)
      }
    }

    // Clear feature cache for this tenant
    featureGateService.clearCache(existingSub.tenant_id)
    
    console.log(`Subscription updated for tenant ${existingSub.tenant_id}: ${existingSub.old_status} -> ${mappedStatus}`)
  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

async function handleSubscriptionCanceled(supabase: any, event: PolarWebhookEvent) {
  console.log('Handling subscription canceled:', event.data.id)
  
  try {
    const subscription = event.data
    
    // Find existing subscription record
    const { data: existingSub, error: findError } = await supabase
      .from('subscription')
      .select('id, tenant_id')
      .eq('polar_subscription_id', subscription.id)
      .single()

    if (findError || !existingSub) {
      console.error('Subscription not found:', subscription.id)
      return
    }

    // Update subscription status
    const { error: updateError } = await supabase
      .from('subscription')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        ended_at: subscription.ended_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSub.id)

    if (updateError) {
      console.error('Error updating cancelled subscription:', updateError)
      return
    }

    // Clear feature cache for this tenant
    featureGateService.clearCache(existingSub.tenant_id)
    
    console.log(`Subscription cancelled for tenant ${existingSub.tenant_id}`)
  } catch (error) {
    console.error('Error handling subscription cancellation:', error)
  }
}

async function handleSubscriptionReactivated(supabase: any, event: PolarWebhookEvent) {
  console.log('Handling subscription reactivated:', event.data.id)
  
  try {
    const subscription = event.data
    
    // Find existing subscription record
    const { data: existingSub, error: findError } = await supabase
      .from('subscription')
      .select('id, tenant_id')
      .eq('polar_subscription_id', subscription.id)
      .single()

    if (findError || !existingSub) {
      console.error('Subscription not found:', subscription.id)
      return
    }

    // Reactivate subscription
    const { error: updateError } = await supabase
      .from('subscription')
      .update({
        status: 'active',
        cancelled_at: null,
        ended_at: null,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSub.id)

    if (updateError) {
      console.error('Error reactivating subscription:', updateError)
      return
    }

    // Clear feature cache for this tenant
    featureGateService.clearCache(existingSub.tenant_id)
    
    console.log(`Subscription reactivated for tenant ${existingSub.tenant_id}`)
  } catch (error) {
    console.error('Error handling subscription reactivation:', error)
  }
}

async function handleCheckoutCompleted(supabase: any, event: PolarWebhookEvent) {
  console.log('Handling checkout completed:', event.data.id)
  
  try {
    const checkout = event.data
    
    if (checkout.subscription_id) {
      // This checkout created a subscription, it will be handled by subscription.created event
      console.log('Checkout completed with subscription:', checkout.subscription_id)
      
      // Check if this was a trial conversion
      const metadata = checkout.metadata || {}
      if (metadata.tenant_id) {
        // Look for existing trial subscription
        const { data: existingTrial, error: trialError } = await supabase
          .from('subscription')
          .select('id, status')
          .eq('tenant_id', metadata.tenant_id)
          .eq('status', 'trialing')
          .single()
        
        if (!trialError && existingTrial) {
          // This was a trial conversion - mark old trial as converted
          await supabase
            .from('subscription')
            .update({
              status: 'converted',
              converted_at: new Date().toISOString(),
              converted_to_subscription_id: checkout.subscription_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingTrial.id)
          
          // Log conversion success
          await supabase
            .from('subscription_event')
            .insert({
              subscription_id: existingTrial.id,
              tenant_id: metadata.tenant_id,
              event_type: 'trial_converted',
              event_source: 'webhook',
              previous_status: 'trialing',
              new_status: 'converted',
              event_data: {
                checkout_id: checkout.id,
                new_subscription_id: checkout.subscription_id,
                conversion_completed_at: new Date().toISOString()
              }
            })
          
          console.log(`Trial converted for tenant ${metadata.tenant_id}: ${existingTrial.id} -> ${checkout.subscription_id}`)
        }
      }
    }
  } catch (error) {
    console.error('Error handling checkout completed:', error)
  }
}

async function handleCustomerCreated(supabase: any, event: PolarWebhookEvent) {
  console.log('Handling customer created:', event.data.id)
  
  const customer = event.data
  
  try {
    // Find user by email
    const { data: user, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.error('Error fetching users:', userError)
      return
    }

    const matchingUser = user.users.find((u: any) => u.email === customer.email)
    
    if (!matchingUser) {
      console.log('No user found for customer email:', customer.email)
      return
    }

    // Find tenant where this user is owner
    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .select('tenant_id')
      .eq('user_id', matchingUser.id)
      .eq('role', 'owner')
      .single()

    if (membershipError || !membership) {
      console.log('No tenant ownership found for user:', matchingUser.id)
      return
    }

    // Update the tenant with Polar customer ID
    const { error: updateError } = await supabase
      .from('tenant')
      .update({
        polar_customer_id: customer.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', membership.tenant_id)

    if (updateError) {
      console.error('Error updating tenant with customer ID:', updateError)
      return
    }

    console.log(`Linked Polar customer ${customer.id} to tenant ${membership.tenant_id}`)
  } catch (error) {
    console.error('Error handling customer creation:', error)
  }
}

async function handleCustomerUpdated(supabase: any, event: PolarWebhookEvent) {
  console.log('Handling customer updated:', event.data.id)
  // Customer updates typically don't require action in our system
}

async function handleInvoiceEvent(supabase: any, event: PolarWebhookEvent) {
  console.log('Handling invoice event:', event.type, event.data.id)
  
  try {
    const invoice = event.data
    
    // Find subscription by customer ID
    const { data: subscription, error: subError } = await supabase
      .from('subscription')
      .select('id, tenant_id')
      .eq('polar_customer_id', invoice.customer_id)
      .single()

    if (subError || !subscription) {
      console.log('No subscription found for invoice customer:', invoice.customer_id)
      return
    }

    // Record billing history
    const { error: billingError } = await supabase
      .from('subscription_billing_history')
      .insert({
        subscription_id: subscription.id,
        tenant_id: subscription.tenant_id,
        billing_period_start: invoice.period_start,
        billing_period_end: invoice.period_end,
        amount: invoice.amount / 100, // Convert from cents
        currency: invoice.currency,
        status: event.type === 'invoice.paid' ? 'paid' : 
               event.type === 'invoice.payment_failed' ? 'failed' : 'pending',
        invoice_date: invoice.created_at,
        due_date: invoice.due_date,
        paid_date: event.type === 'invoice.paid' ? new Date().toISOString() : null,
        provider: 'polar',
        provider_invoice_id: invoice.id,
        failure_reason: event.type === 'invoice.payment_failed' ? 'Payment failed' : null
      })

    if (billingError) {
      console.error('Error recording billing history:', billingError)
    }

    console.log(`Recorded ${event.type} for tenant ${subscription.tenant_id}`)
  } catch (error) {
    console.error('Error handling invoice event:', error)
  }
}