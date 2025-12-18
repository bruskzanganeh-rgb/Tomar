import { NextRequest, NextResponse } from 'next/server'
import { getDropboxClient } from '@/lib/dropbox/client'
import { scanAllInvoices, scanYear } from '@/lib/dropbox/scanner'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const year = searchParams.get('year')

  try {
    const dbx = await getDropboxClient()

    if (!dbx) {
      return NextResponse.json(
        { error: 'Dropbox not connected' },
        { status: 401 }
      )
    }

    // Scan invoices from Dropbox
    const invoices = year
      ? await scanYear(dbx, parseInt(year))
      : await scanAllInvoices(dbx)

    // Get existing invoices from database
    const supabase = await createClient()
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('invoice_number')

    const existingNumbers = new Set(
      existingInvoices?.map((inv) => inv.invoice_number) || []
    )

    // Mark which invoices are missing from database
    const invoicesWithStatus = invoices.map((inv) => ({
      ...inv,
      existsInDb: existingNumbers.has(inv.invoiceNumber),
      status: existingNumbers.has(inv.invoiceNumber) ? 'exists' : 'missing',
    }))

    const summary = {
      total: invoices.length,
      existing: invoicesWithStatus.filter((i) => i.existsInDb).length,
      missing: invoicesWithStatus.filter((i) => !i.existsInDb).length,
      firstInvoice: invoices[0]?.invoiceNumber,
      lastInvoice: invoices[invoices.length - 1]?.invoiceNumber,
    }

    return NextResponse.json({
      invoices: invoicesWithStatus,
      summary,
    })
  } catch (error: any) {
    console.error('Error scanning invoices from Dropbox:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to scan invoices' },
      { status: 500 }
    )
  }
}
