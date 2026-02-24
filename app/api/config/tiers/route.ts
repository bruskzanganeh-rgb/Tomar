import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULTS = {
  free: { invoiceLimit: 5, receiptScanLimit: 3, storageMb: 10, priceMonthly: 0, priceYearly: 0, features: ['unlimitedGigs', 'basicInvoicing', 'calendarView'] },
  pro: { invoiceLimit: 0, receiptScanLimit: 0, storageMb: 1024, priceMonthly: 5, priceYearly: 50, features: ['unlimitedInvoices', 'unlimitedScans', 'noBranding'] },
  team: { invoiceLimit: 0, receiptScanLimit: 0, storageMb: 5120, priceMonthly: 10, priceYearly: 100, features: ['everythingInPro', 'inviteMembers', 'sharedCalendar'] },
}

function parseJsonArray(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function buildTier(prefix: string, config: Record<string, string>, defaults: typeof DEFAULTS.free) {
  return {
    invoiceLimit: parseInt(config[`${prefix}_invoice_limit`] ?? String(defaults.invoiceLimit)),
    receiptScanLimit: parseInt(config[`${prefix}_receipt_scan_limit`] ?? String(defaults.receiptScanLimit)),
    storageMb: parseInt(config[`${prefix}_storage_mb`] ?? String(defaults.storageMb)),
    priceMonthly: parseInt(config[`${prefix}_price_monthly`] ?? String(defaults.priceMonthly)),
    priceYearly: parseInt(config[`${prefix}_price_yearly`] ?? String(defaults.priceYearly)),
    features: parseJsonArray(config[`${prefix}_features`], defaults.features),
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('platform_config')
      .select('key, value')
      .or('key.like.free_%,key.like.pro_%,key.like.team_%')

    const config: Record<string, string> = {}
    data?.forEach(d => { config[d.key] = d.value })

    return NextResponse.json({
      free: buildTier('free', config, DEFAULTS.free),
      pro: buildTier('pro', config, DEFAULTS.pro),
      team: buildTier('team', config, DEFAULTS.team),
    })
  } catch {
    return NextResponse.json(DEFAULTS)
  }
}
