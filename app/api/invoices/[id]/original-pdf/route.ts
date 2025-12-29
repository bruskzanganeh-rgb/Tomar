import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Extrahera filsökväg från public URL
function extractFilePath(attachmentUrl: string): string | null {
  try {
    // URL format: https://{project}.supabase.co/storage/v1/object/public/expenses/invoices/2025/file.pdf
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
    const { id } = await params

    // Hämta faktura för att få original_pdf_url
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('original_pdf_url')
      .eq('id', id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: 'Faktura hittades inte' },
        { status: 404 }
      )
    }

    if (!invoice.original_pdf_url) {
      return NextResponse.json(
        { error: 'Ingen original-PDF finns' },
        { status: 404 }
      )
    }

    const filePath = extractFilePath(invoice.original_pdf_url)
    if (!filePath) {
      return NextResponse.json(
        { error: 'Kunde inte läsa filsökväg' },
        { status: 400 }
      )
    }

    // Skapa signerad URL (giltig i 1 timme)
    const { data: signedData, error: signError } = await supabase.storage
      .from('expenses')
      .createSignedUrl(filePath, 3600)

    if (signError || !signedData) {
      console.error('Signed URL error:', signError)
      return NextResponse.json(
        { error: 'Kunde inte skapa signerad URL' },
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
      { error: 'Ett fel uppstod' },
      { status: 500 }
    )
  }
}
