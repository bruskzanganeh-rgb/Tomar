import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin'

export async function GET() {
  const auth = await verifyAdmin()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  // Count all users
  const { count: totalUsers } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })

  // Fetch active pro subscriptions with price_id for MRR calculation
  const { data: proSubs } = await supabase
    .from('subscriptions')
    .select('stripe_price_id')
    .eq('plan', 'pro')
    .eq('status', 'active')

  const proUsers = proSubs?.length || 0
  const freeUsers = (totalUsers || 0) - proUsers

  // Calculate accurate MRR based on plan type
  const monthlyPriceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID
  const yearlyPriceId = process.env.STRIPE_PRO_YEARLY_PRICE_ID

  const monthlySubscribers = proSubs?.filter(s => s.stripe_price_id === monthlyPriceId).length || 0
  const yearlySubscribers = proSubs?.filter(s => s.stripe_price_id === yearlyPriceId).length || 0
  const adminSetPro = proUsers - monthlySubscribers - yearlySubscribers

  const mrr = monthlySubscribers * 49 + yearlySubscribers * Math.round(499 / 12)
  const arr = mrr * 12

  // Total sponsor impressions
  const { count: totalImpressions } = await supabase
    .from('sponsor_impressions')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    totalUsers: totalUsers || 0,
    proUsers,
    freeUsers,
    mrr,
    arr,
    monthlySubscribers,
    yearlySubscribers,
    adminSetPro,
    totalImpressions: totalImpressions || 0,
  })
}
