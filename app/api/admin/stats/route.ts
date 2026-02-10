import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin'

export async function GET() {
  const auth = await verifyAdmin()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  // Count subscriptions by plan
  const { count: totalUsers } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })

  const { count: proUsers } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('plan', 'pro')
    .eq('status', 'active')

  const freeUsers = (totalUsers || 0) - (proUsers || 0)

  // MRR = pro users * 49 kr (simplified)
  const mrr = (proUsers || 0) * 49

  // Total sponsor impressions
  const { count: totalImpressions } = await supabase
    .from('sponsor_impressions')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    totalUsers: totalUsers || 0,
    proUsers: proUsers || 0,
    freeUsers,
    mrr,
    totalImpressions: totalImpressions || 0,
  })
}
