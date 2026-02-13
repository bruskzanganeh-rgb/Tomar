import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Extrahera filsökväg från public URL
function extractFilePath(attachmentUrl: string): string | null {
  try {
    const url = new URL(attachmentUrl)
    const pathParts = url.pathname.split('/storage/v1/object/public/expenses/')
    if (pathParts.length > 1) {
      return pathParts[1]
    }
    return null
  } catch {
    return null
  }
}

// GET - Hämta signerad URL för original-PDF
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

    // Hämta faktura - verifiera ägarskap
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('original_pdf_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    if (!invoice.original_pdf_url) {
      return NextResponse.json(
        { error: 'No original PDF exists' },
        { status: 404 }
      )
    }

    const filePath = extractFilePath(invoice.original_pdf_url)
    if (!filePath) {
      return NextResponse.json(
        { error: 'Could not read file path' },
        { status: 400 }
      )
    }

    // Skapa signerad URL (giltig i 1 timme) - needs service role for storage
    const { data: signedData, error: signError } = await serviceSupabase.storage
      .from('expenses')
      .createSignedUrl(filePath, 3600)

    if (signError || !signedData) {
      console.error('Signed URL error:', signError)
      return NextResponse.json(
        { error: 'Could not create signed URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: signedData.signedUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    })
  } catch (error) {
    console.error('Original PDF GET error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
