import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEFAULT_LIMITS = {
  invoices: 5,
  receiptScans: 3,
}

async function getFreeLimits() {
  const { data } = await supabaseAdmin
    .from('platform_config')
    .select('key, value')
    .in('key', ['free_invoice_limit', 'free_receipt_scan_limit'])

  if (!data || data.length === 0) return DEFAULT_LIMITS

  return {
    invoices: parseInt(data.find(d => d.key === 'free_invoice_limit')?.value || String(DEFAULT_LIMITS.invoices)),
    receiptScans: parseInt(data.find(d => d.key === 'free_receipt_scan_limit')?.value || String(DEFAULT_LIMITS.receiptScans)),
  }
}

export async function incrementUsage(
  userId: string,
  type: 'invoice' | 'receipt_scan'
) {
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
    const field = type === 'invoice' ? 'invoice_count' : 'receipt_scan_count'
    await supabaseAdmin
      .from('usage_tracking')
      .update({ [field]: (existing as any)[field] + 1 })
      .eq('id', existing.id)
  } else {
    await supabaseAdmin
      .from('usage_tracking')
      .insert({
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
  type: 'invoice' | 'receipt_scan'
): Promise<{ allowed: boolean; current: number; limit: number }> {
  // Check subscription
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .single()

  const isPro = subscription?.plan === 'pro' && subscription?.status === 'active'

  if (isPro) {
    return { allowed: true, current: 0, limit: Infinity }
  }

  const limits = await getFreeLimits()

  const now = new Date()
  const { data: usage } = await supabaseAdmin
    .from('usage_tracking')
    .select('invoice_count, receipt_scan_count')
    .eq('user_id', userId)
    .eq('year', now.getFullYear())
    .eq('month', now.getMonth() + 1)
    .single()

  const current = type === 'invoice'
    ? (usage?.invoice_count || 0)
    : (usage?.receipt_scan_count || 0)

  const limit = type === 'invoice'
    ? limits.invoices
    : limits.receiptScans

  return { allowed: current < limit, current, limit }
}
