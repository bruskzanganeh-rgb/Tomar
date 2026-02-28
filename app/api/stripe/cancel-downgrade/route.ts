import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST() {
  const { success: rl } = rateLimit('cancel-downgrade', 5, 60_000)
  if (!rl) return rateLimitResponse()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id, pending_plan')
    .eq('user_id', user.id)
    .single()

  if (!sub?.stripe_subscription_id || !sub.pending_plan) {
    return NextResponse.json({ error: 'No pending downgrade' }, { status: 400 })
  }

  try {
    // Find and cancel the subscription schedule
    const stripe = getStripe()
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)

    if (stripeSub.schedule) {
      const scheduleId = typeof stripeSub.schedule === 'string' ? stripeSub.schedule : stripeSub.schedule.id

      await stripe.subscriptionSchedules.release(scheduleId)
    }

    // Clear pending_plan in DB
    await supabase.from('subscriptions').update({ pending_plan: null }).eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Cancel downgrade error:', err)
    const message = err instanceof Error ? err.message : 'Failed to cancel downgrade'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
