import { createClient } from '@/lib/supabase/server'
import { stripe, getPlanFromPriceId } from '@/lib/stripe'
import { NextResponse } from 'next/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { success: rl } = rateLimit(`change-plan:${ip}`, 5, 60_000)
  if (!rl) return rateLimitResponse()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { priceId } = await request.json()
  if (!priceId) {
    return NextResponse.json({ error: 'priceId is required' }, { status: 400 })
  }

  const targetPlan = getPlanFromPriceId(priceId)

  // For team plan, verify the user is a company owner
  if (targetPlan === 'team') {
    const { data: membership } = await supabase
      .from('company_members')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only company owners can subscribe to team plan' }, { status: 403 })
    }
  }

  // Get current subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id, stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json({ error: 'No active Stripe subscription to modify' }, { status: 400 })
  }

  try {
    // Get the current subscription from Stripe
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
    const itemId = stripeSub.items.data[0]?.id

    if (!itemId) {
      return NextResponse.json({ error: 'No subscription item found' }, { status: 400 })
    }

    // Update the subscription with the new price
    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: 'create_prorations',
    })

    // Update the database immediately (webhook will also handle this)
    const newPriceId = updated.items.data[0]?.price.id
    await supabase
      .from('subscriptions')
      .update({
        plan: getPlanFromPriceId(newPriceId),
        stripe_price_id: newPriceId,
      })
      .eq('user_id', user.id)

    return NextResponse.json({ success: true, plan: getPlanFromPriceId(newPriceId) })
  } catch (err: any) {
    console.error('Change plan error:', err)
    return NextResponse.json({ error: err.message || 'Failed to change plan' }, { status: 500 })
  }
}
