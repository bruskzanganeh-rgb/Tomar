import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getPlanFromPriceId } from '@/lib/stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
})

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request) {
  const body = await request.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    console.error('Webhook signature verification failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
      break
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id
  if (!userId) return

  const subscriptionId = session.subscription as string
  const plan = (session.metadata?.plan as 'pro' | 'team') || 'pro'
  const companyId = session.metadata?.company_id || null

  // Fetch the Stripe subscription for period details
  const stripeSub = await stripe.subscriptions.retrieve(subscriptionId)

  await supabase
    .from('subscriptions')
    .update({
      plan,
      status: 'active',
      stripe_subscription_id: subscriptionId,
      stripe_price_id: stripeSub.items.data[0]?.price.id || null,
      current_period_start: new Date(stripeSub.start_date * 1000).toISOString(),
      current_period_end: stripeSub.ended_at ? new Date(stripeSub.ended_at * 1000).toISOString() : null,
      admin_override: false,
      ...(companyId ? { company_id: companyId } : {}),
    })
    .eq('user_id', userId)
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!sub) return

  const isActive = ['active', 'trialing'].includes(subscription.status)
  const priceId = subscription.items.data[0]?.price.id
  const plan = isActive ? getPlanFromPriceId(priceId) : 'free'

  // Clear pending_plan when the plan actually changes (scheduled downgrade completed)
  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('plan, pending_plan')
    .eq('user_id', sub.user_id)
    .single()

  const pendingPlan = currentSub?.pending_plan === plan ? null : currentSub?.pending_plan

  await supabase
    .from('subscriptions')
    .update({
      plan,
      status: subscription.status as 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete',
      stripe_price_id: priceId || null,
      current_period_start: new Date(subscription.start_date * 1000).toISOString(),
      current_period_end: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      pending_plan: pendingPlan ?? null,
      admin_override: false,
    })
    .eq('user_id', sub.user_id)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!sub) return

  await supabase
    .from('subscriptions')
    .update({
      plan: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      stripe_price_id: null,
      cancel_at_period_end: false,
      admin_override: false,
    })
    .eq('user_id', sub.user_id)
}
