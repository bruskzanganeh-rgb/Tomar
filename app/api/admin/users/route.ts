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

  // Fetch per-user stats in parallel
  const userIds = (subscriptions || []).map(s => s.user_id)

  const [invoiceCounts, clientCounts, positionCounts, gigTypeCounts, expenseCounts, usageData] = await Promise.all([
    supabase.rpc('count_by_user', { table_name: 'invoices', user_ids: userIds }).then(r => r.data),
    supabase.rpc('count_by_user', { table_name: 'clients', user_ids: userIds }).then(r => r.data),
    supabase.rpc('count_by_user', { table_name: 'positions', user_ids: userIds }).then(r => r.data),
    supabase.rpc('count_by_user', { table_name: 'gig_types', user_ids: userIds }).then(r => r.data),
    supabase.rpc('count_by_user', { table_name: 'expenses', user_ids: userIds }).then(r => r.data),
    supabase
      .from('usage_tracking')
      .select('user_id, invoice_count, receipt_scan_count')
      .in('user_id', userIds)
      .eq('year', year)
      .eq('month', month)
      .then(r => r.data),
  ])

  // Build lookup maps
  const makeMap = (data: any[] | null) => {
    const map = new Map<string, number>()
    if (data) data.forEach((d: any) => map.set(d.user_id, d.count))
    return map
  }

  const invoiceMap = makeMap(invoiceCounts)
  const clientMap = makeMap(clientCounts)
  const positionMap = makeMap(positionCounts)
  const gigTypeMap = makeMap(gigTypeCounts)
  const expenseMap = makeMap(expenseCounts)

  const usageMap = new Map<string, { invoices: number; scans: number }>()
  if (usageData) {
    usageData.forEach((u: any) => {
      usageMap.set(u.user_id, {
        invoices: u.invoice_count || 0,
        scans: u.receipt_scan_count || 0,
      })
    })
  }

  const users = (subscriptions || []).map(sub => ({
    ...sub,
    company_name: settingsMap.get(sub.user_id)?.company_name || null,
    org_number: settingsMap.get(sub.user_id)?.org_number || null,
    email: settingsMap.get(sub.user_id)?.email || null,
    address: settingsMap.get(sub.user_id)?.address || null,
    phone: settingsMap.get(sub.user_id)?.phone || null,
    invoice_count: invoiceMap.get(sub.user_id) || 0,
    client_count: clientMap.get(sub.user_id) || 0,
    position_count: positionMap.get(sub.user_id) || 0,
    gig_type_count: gigTypeMap.get(sub.user_id) || 0,
    expense_count: expenseMap.get(sub.user_id) || 0,
    monthly_invoices: usageMap.get(sub.user_id)?.invoices || 0,
    monthly_scans: usageMap.get(sub.user_id)?.scans || 0,
  }))

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
    const { data: invited, error } = await supabase.auth.admin.inviteUserByEmail(email)
    if (error || !invited.user) {
      return NextResponse.json({ error: error?.message || 'Failed to invite user' }, { status: 500 })
    }
    newUserId = invited.user.id
  }

  // Create company_settings
  await supabase.from('company_settings').insert({
    user_id: newUserId,
    company_name: company_name || null,
    email,
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
