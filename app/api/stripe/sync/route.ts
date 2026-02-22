import { createClient } from '@/lib/supabase/server'
import { stripe, getPlanFromPriceId } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ synced: false, reason: 'No Stripe customer' })
  }

  // Fetch active subscriptions from Stripe
  const stripeSubs = await stripe.subscriptions.list({
    customer: subscription.stripe_customer_id,
    status: 'active',
    limit: 1,
  })

  if (stripeSubs.data.length > 0) {
    const activeSub = stripeSubs.data[0]
    const priceId = activeSub.items.data[0]?.price.id
    const plan = getPlanFromPriceId(priceId)

    await supabase
      .from('subscriptions')
      .update({
        plan,
        status: 'active',
        stripe_subscription_id: activeSub.id,
        stripe_price_id: priceId || null,
        current_period_start: new Date(activeSub.items.data[0].current_period_start * 1000).toISOString(),
        current_period_end: new Date(activeSub.items.data[0].current_period_end * 1000).toISOString(),
        cancel_at_period_end: activeSub.cancel_at_period_end,
      })
      .eq('user_id', user.id)

    return NextResponse.json({ synced: true, plan })
  }

  return NextResponse.json({ synced: false, reason: 'No active subscription in Stripe' })
}
