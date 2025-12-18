import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInvoicePdf } from '@/lib/pdf/generator'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Fetch invoice with client
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        invoice_number,
        invoice_date,
        due_date,
        subtotal,
        vat_rate,
        vat_amount,
        total,
        client:clients(name, org_number, address)
      `)
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Fetch company settings
    const { data: company, error: companyError } = await supabase
      .from('company_settings')
      .select('company_name, org_number, address, email, phone, bank_account, logo_url')
      .single()

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company settings not found' },
        { status: 500 }
      )
    }

    // Fetch invoice lines if they exist
    const { data: lines } = await supabase
      .from('invoice_lines')
      .select('description, amount, is_vat_exempt')
      .eq('invoice_id', id)
      .order('sort_order')

    // Generate PDF
    const pdfBuffer = await generateInvoicePdf({
      invoice: {
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        subtotal: invoice.subtotal,
        vat_rate: invoice.vat_rate,
        vat_amount: invoice.vat_amount,
        total: invoice.total,
      },
      client: invoice.client as unknown as { name: string; org_number: string | null; address: string | null },
      company,
      lines: lines || undefined,
    })

    // Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Faktura-${invoice.invoice_number}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
