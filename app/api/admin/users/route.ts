import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin'
import { logActivity } from '@/lib/activity'
import { createUserSchema } from '@/lib/schemas/admin'

export async function GET() {
  const auth = await verifyAdmin()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  // Fetch all subscriptions with company info
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('user_id, plan, status, stripe_customer_id, stripe_price_id, current_period_end, cancel_at_period_end, created_at')
    .order('created_at', { ascending: false })

  // Fetch company settings for all users
  const { data: settings } = await supabase
    .from('company_settings')
    .select('user_id, company_name, org_number, email, address, phone')

  const settingsMap = new Map((settings || []).map(s => [s.user_id, s]))

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // Fetch per-user stats with consolidated RPC (1 query instead of 5)
  const userIds = (subscriptions || []).map(s => s.user_id)

  const [statsData, usageData] = await Promise.all([
    supabase.rpc('admin_user_stats', { p_user_ids: userIds }).then(r => r.data),
    supabase
      .from('usage_tracking')
      .select('user_id, invoice_count, receipt_scan_count')
      .in('user_id', userIds)
      .eq('year', year)
      .eq('month', month)
      .then(r => r.data),
  ])

  // Build lookup maps
  const statsMap = new Map<string, { invoice_count: number; client_count: number; position_count: number; gig_type_count: number; expense_count: number }>()
  if (statsData) {
    statsData.forEach((s: any) => statsMap.set(s.user_id, s))
  }

  const usageMap = new Map<string, { invoices: number; scans: number }>()
  if (usageData) {
    usageData.forEach((u: any) => {
      usageMap.set(u.user_id, {
        invoices: u.invoice_count || 0,
        scans: u.receipt_scan_count || 0,
      })
    })
  }

  const users = (subscriptions || []).map(sub => {
    const stats = statsMap.get(sub.user_id)
    return {
      ...sub,
      company_name: settingsMap.get(sub.user_id)?.company_name || null,
      org_number: settingsMap.get(sub.user_id)?.org_number || null,
      email: settingsMap.get(sub.user_id)?.email || null,
      address: settingsMap.get(sub.user_id)?.address || null,
      phone: settingsMap.get(sub.user_id)?.phone || null,
      invoice_count: stats?.invoice_count || 0,
      client_count: stats?.client_count || 0,
      position_count: stats?.position_count || 0,
      gig_type_count: stats?.gig_type_count || 0,
      expense_count: stats?.expense_count || 0,
      monthly_invoices: usageMap.get(sub.user_id)?.invoices || 0,
      monthly_scans: usageMap.get(sub.user_id)?.scans || 0,
    }
  })

  return NextResponse.json({ users })
}

export async function POST(request: Request) {
  const auth = await verifyAdmin()
  if (auth instanceof NextResponse) return auth
  const { userId, supabase } = auth

  const body = await request.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { email, password, company_name, mode } = parsed.data

  let newUserId: string

  if (mode === 'create') {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error || !newUser.user) {
      return NextResponse.json({ error: error?.message || 'Failed to create user' }, { status: 500 })
    }
    newUserId = newUser.user.id
  } else {
    const { data: invited, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://amida.babalisk.com'}/auth/callback`,
    })
    if (error || !invited.user) {
      return NextResponse.json({ error: error?.message || 'Failed to invite user' }, { status: 500 })
    }
    newUserId = invited.user.id
  }

  // Create company_settings (all NOT NULL text columns need empty-string defaults)
  await supabase.from('company_settings').insert({
    user_id: newUserId,
    company_name: company_name || '',
    org_number: '',
    address: '',
    email,
    phone: '',
    bank_account: '',
    base_currency: 'SEK',
    onboarding_completed: false,
  })

  // Create subscription (free plan)
  await supabase.from('subscriptions').insert({
    user_id: newUserId,
    plan: 'free',
    status: 'active',
  })

  await logActivity({
    userId,
    eventType: 'user_created',
    entityType: 'user',
    entityId: newUserId,
    metadata: { mode, email, created_by: userId },
  })

  return NextResponse.json({ success: true, userId: newUserId, mode })
}
