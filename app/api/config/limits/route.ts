import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULT_LIMITS = {
  invoices: 5,
  receiptScans: 3,
}

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('platform_config')
      .select('key, value')
      .in('key', ['free_invoice_limit', 'free_receipt_scan_limit'])

    if (!data || data.length === 0) {
      return NextResponse.json(DEFAULT_LIMITS)
    }

    return NextResponse.json({
      invoices: parseInt(data.find(d => d.key === 'free_invoice_limit')?.value || String(DEFAULT_LIMITS.invoices)),
      receiptScans: parseInt(data.find(d => d.key === 'free_receipt_scan_limit')?.value || String(DEFAULT_LIMITS.receiptScans)),
    })
  } catch {
    return NextResponse.json(DEFAULT_LIMITS)
  }
}
