import { NextRequest, NextResponse } from 'next/server'
import { getDropboxClient } from '@/lib/dropbox/client'
import { extractInvoiceNumberFromFilename } from '@/lib/pdf/extractor'
import type { DropboxInvoiceFile } from '@/lib/types/import'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const year = searchParams.get('year')

  if (!year) {
    return NextResponse.json({ error: 'Year parameter required' }, { status: 400 })
  }

  try {
    const dbx = await getDropboxClient()

    if (!dbx) {
      return NextResponse.json(
        { error: 'Dropbox not connected' },
        { status: 401 }
      )
    }

    // List files in /Kundfakturor/{year}/
    const path = `/Kundfakturor/${year}`
    const response = await dbx.filesListFolder({ path })

    const invoices: DropboxInvoiceFile[] = response.result.entries
      .filter((entry) => {
        // Only include PDF files
        return entry['.tag'] === 'file' && entry.name.toLowerCase().endsWith('.pdf')
      })
      .map((entry) => {
        const invoiceNumber = extractInvoiceNumberFromFilename(entry.name)
        return {
          path: entry.path_display || entry.path_lower || '',
          name: entry.name,
          size: 'size' in entry ? entry.size : 0,
          modified: 'client_modified' in entry ? entry.client_modified : '',
          invoiceNumber: invoiceNumber || 0,
        }
      })
      .filter((inv) => inv.invoiceNumber > 0) // Only include valid invoice files
      .sort((a, b) => a.invoiceNumber - b.invoiceNumber)

    return NextResponse.json({ invoices })
  } catch (error: any) {
    console.error('Error listing invoices from Dropbox:', error)

    // Check if folder doesn't exist
    if (error?.error?.error_summary?.includes('not_found')) {
      return NextResponse.json({ invoices: [] })
    }

    return NextResponse.json(
      { error: error.message || 'Failed to list invoices' },
      { status: 500 }
    )
  }
}
