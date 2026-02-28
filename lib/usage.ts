import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const DEFAULT_TIER_LIMITS = {
  free: { invoices: 5, receiptScans: 3, storageMb: 10 },
  pro: { invoices: 0, receiptScans: 0, storageMb: 1024 },
  team: { invoices: 0, receiptScans: 0, storageMb: 5120 },
} as const

type Plan = 'free' | 'pro' | 'team'

async function getTierLimits(plan: Plan) {
  const defaults = DEFAULT_TIER_LIMITS[plan]
  const { data } = await supabaseAdmin
    .from('platform_config')
    .select('key, value')
    .in('key', [`${plan}_invoice_limit`, `${plan}_receipt_scan_limit`, `${plan}_storage_mb`])

  if (!data || data.length === 0) return defaults

  return {
    invoices: parseInt(data.find((d) => d.key === `${plan}_invoice_limit`)?.value ?? String(defaults.invoices)),
    receiptScans: parseInt(
      data.find((d) => d.key === `${plan}_receipt_scan_limit`)?.value ?? String(defaults.receiptScans),
    ),
    storageMb: parseInt(data.find((d) => d.key === `${plan}_storage_mb`)?.value ?? String(defaults.storageMb)),
  }
}

export async function incrementUsage(userId: string, type: 'invoice' | 'receipt_scan') {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { data: existing } = await supabaseAdmin
    .from('usage_tracking')
    .select('id, invoice_count, receipt_scan_count')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month)
    .single()

  if (existing) {
    const currentCount = type === 'invoice' ? existing.invoice_count : existing.receipt_scan_count
    const field = type === 'invoice' ? 'invoice_count' : 'receipt_scan_count'
    await supabaseAdmin
      .from('usage_tracking')
      .update({ [field]: (currentCount ?? 0) + 1 })
      .eq('id', existing.id)
  } else {
    await supabaseAdmin.from('usage_tracking').insert({
      user_id: userId,
      year,
      month,
      invoice_count: type === 'invoice' ? 1 : 0,
      receipt_scan_count: type === 'receipt_scan' ? 1 : 0,
    })
  }
}

export async function checkUsageLimit(
  userId: string,
  type: 'invoice' | 'receipt_scan',
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .single()

  const plan: Plan =
    subscription?.status === 'active' && (subscription?.plan === 'pro' || subscription?.plan === 'team')
      ? (subscription.plan as Plan)
      : 'free'

  const tierLimits = await getTierLimits(plan)
  const rawLimit = type === 'invoice' ? tierLimits.invoices : tierLimits.receiptScans
  const limit = rawLimit === 0 ? Infinity : rawLimit

  if (limit === Infinity) {
    return { allowed: true, current: 0, limit: Infinity }
  }

  const now = new Date()
  const { data: usage } = await supabaseAdmin
    .from('usage_tracking')
    .select('invoice_count, receipt_scan_count')
    .eq('user_id', userId)
    .eq('year', now.getFullYear())
    .eq('month', now.getMonth() + 1)
    .single()

  const current = type === 'invoice' ? usage?.invoice_count || 0 : usage?.receipt_scan_count || 0

  return { allowed: current < limit, current, limit }
}

export async function checkStorageQuota(userId: string): Promise<{
  allowed: boolean
  usedBytes: number
  limitBytes: number
  plan: string
}> {
  const { data: sub } = await supabaseAdmin.from('subscriptions').select('plan, status').eq('user_id', userId).single()

  const plan: Plan =
    sub?.status === 'active' && (sub?.plan === 'pro' || sub?.plan === 'team') ? (sub.plan as Plan) : 'free'

  const tierLimits = await getTierLimits(plan)
  const limitBytes = tierLimits.storageMb === 0 ? Infinity : tierLimits.storageMb * 1024 * 1024

  const { data: attRows } = await supabaseAdmin.from('gig_attachments').select('file_size').eq('user_id', userId)

  const attBytes = (attRows || []).reduce((sum, r) => sum + (r.file_size || 0), 0)

  const { data: expRows } = await supabaseAdmin
    .from('expenses')
    .select('file_size')
    .eq('user_id', userId)
    .not('attachment_url', 'is', null)

  const expBytes = (expRows || []).reduce((sum, r) => sum + (r.file_size || 0), 0)

  const usedBytes = attBytes + expBytes

  return { allowed: usedBytes < limitBytes, usedBytes, limitBytes, plan }
}
