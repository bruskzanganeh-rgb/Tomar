import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', user.id)
    .single()

  if (!subscription?.stripe_subscription_id) {
    return NextResponse.json({ error: 'No Stripe subscription found' }, { status: 400 })
  }

  await getStripe().subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: false,
  })

  await supabase.from('subscriptions').update({ cancel_at_period_end: false }).eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
