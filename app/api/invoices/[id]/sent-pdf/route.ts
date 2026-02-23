import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Hämta signerad URL för skickad faktura-PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const serviceSupabase = createAdminClient()

    const { id } = await params

    // Hämta faktura - verifiera ägarskap via RLS
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('pdf_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (!invoice.pdf_url) {
      return NextResponse.json({ error: 'No sent PDF exists' }, { status: 404 })
    }

    // pdf_url lagras som ren storage-sökväg, t.ex. "invoices/{id}/sent.pdf"
    const { data: signedData, error: signError } = await serviceSupabase.storage
      .from('expenses')
      .createSignedUrl(invoice.pdf_url, 3600)

    if (signError || !signedData) {
      console.error('Signed URL error:', signError)
      return NextResponse.json({ error: 'Could not create signed URL' }, { status: 500 })
    }

    return NextResponse.json({
      url: signedData.signedUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    })
  } catch (error) {
    console.error('Sent PDF GET error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
