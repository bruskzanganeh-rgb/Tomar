import { NextRequest, NextResponse } from 'next/server'
import { getDropboxClient } from '@/lib/dropbox/client'
import { extractTextFromPDF } from '@/lib/pdf/extractor'
import { parseInvoiceWithAI } from '@/lib/pdf/parser'
import { matchClient } from '@/lib/pdf/client-matcher'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { invoices } = await request.json()

    if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
      return NextResponse.json(
        { error: 'Invoices array is required' },
        { status: 400 }
      )
    }

    console.log('Starting batch import of ' + invoices.length + ' invoices...')

    const dbx = await getDropboxClient()
    const supabase = await createClient()

    if (!dbx) {
      return NextResponse.json(
        { error: 'Dropbox not connected' },
        { status: 401 }
      )
    }

    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name')

    console.log('Fetched clients:', clients?.length || 0)
    if (clientsError) {
      console.error('Error fetching clients:', clientsError)
    }
    if (clients && clients.length > 0) {
      console.log('Sample clients:', clients.slice(0, 3).map(c => c.name))
    }

    const results = []

    for (const invoice of invoices) {
      try {
        console.log('Processing invoice #' + invoice.invoiceNumber + ': ' + invoice.name)

        const downloadResponse = await dbx.filesDownload({ path: invoice.path }) as { result: any }

        // Extract the binary data (can be fileBinary in Node or fileBlob in browser)
        const fileData = downloadResponse.result?.fileBinary || downloadResponse.result?.fileBlob

        if (!fileData) {
          console.error('Dropbox response:', {
            hasResult: !!downloadResponse.result,
            resultKeys: downloadResponse.result ? Object.keys(downloadResponse.result) : [],
          })
          throw new Error('No file data received from Dropbox')
        }

        // Convert to Buffer
        const buffer = Buffer.isBuffer(fileData)
          ? fileData
          : fileData instanceof Blob
          ? Buffer.from(await fileData.arrayBuffer())
          : Buffer.from(fileData)
        console.log('Downloaded ' + buffer.length + ' bytes')

        console.log('Extracting text from PDF...')
        const text = await extractTextFromPDF(buffer)

        console.log('Parsing with AI...')
        const parsedData = await parseInvoiceWithAI(text)

        console.log('AI extracted client name: "' + parsedData.clientName + '"')
        console.log('Confidence: ' + parsedData.confidence)

        const matchedClient = parsedData.clientName
          ? matchClient(parsedData.clientName, clients || [])
          : null

        console.log('Matched client: ' + (matchedClient?.name || 'No match'))

        const { data: insertedInvoice, error: insertError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoice.invoiceNumber,
            client_id: matchedClient?.id || null,
            invoice_date: parsedData.invoiceDate,
            due_date: parsedData.dueDate,
            subtotal: parsedData.subtotal,
            vat_rate: parsedData.vatRate,
            vat_amount: parsedData.vatAmount,
            total: parsedData.total,
            status: 'paid',
            imported_from_pdf: true,
          })
          .select()
          .single()

        if (insertError) {
          throw insertError
        }

        console.log('Imported invoice #' + invoice.invoiceNumber)

        results.push({
          success: true,
          invoiceNumber: invoice.invoiceNumber,
          parsedData,
          matchedClient: matchedClient?.name || null,
          id: insertedInvoice.id,
        })
      } catch (error: any) {
        console.error('Failed to import invoice #' + invoice.invoiceNumber + ':', error.message)
        results.push({
          success: false,
          invoiceNumber: invoice.invoiceNumber,
          error: error.message,
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log('Batch import complete: ' + successCount + ' succeeded, ' + failCount + ' failed')

    return NextResponse.json({
      results,
      summary: {
        total: invoices.length,
        succeeded: successCount,
        failed: failCount,
      },
    })
  } catch (error: any) {
    console.error('Batch import error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import invoices' },
      { status: 500 }
    )
  }
}
