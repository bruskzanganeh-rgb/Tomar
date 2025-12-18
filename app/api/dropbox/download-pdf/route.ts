import { NextRequest, NextResponse } from 'next/server'
import { getDropboxClient } from '@/lib/dropbox/client'
import { extractTextFromPDF } from '@/lib/pdf/extractor'
import { parseInvoiceWithAI } from '@/lib/pdf/parser'

export async function POST(request: NextRequest) {
  try {
    const { path, parseWithAI } = await request.json()

    if (!path) {
      return NextResponse.json({ error: 'Path parameter required' }, { status: 400 })
    }

    const dbx = await getDropboxClient()

    if (!dbx) {
      return NextResponse.json(
        { error: 'Dropbox not connected' },
        { status: 401 }
      )
    }

    console.log(`📥 Downloading PDF from Dropbox: ${path}`)

    // Download file from Dropbox
    const response = await dbx.filesDownload({ path }) as { result: any }

    // Extract the binary data (can be fileBinary in Node or fileBlob in browser)
    const fileData = response.result?.fileBinary || response.result?.fileBlob

    if (!fileData) {
      console.error('Dropbox response:', {
        hasResult: !!response.result,
        resultKeys: response.result ? Object.keys(response.result) : [],
      })
      return NextResponse.json(
        { error: 'No file data received' },
        { status: 500 }
      )
    }

    // Convert to Buffer
    const buffer = Buffer.isBuffer(fileData)
      ? fileData
      : fileData instanceof Blob
      ? Buffer.from(await fileData.arrayBuffer())
      : Buffer.from(fileData)
    console.log(`✅ Downloaded ${buffer.length} bytes`)

    // If parseWithAI is requested, extract text and parse
    if (parseWithAI) {
      console.log(`🤖 Parsing PDF with AI...`)
      const text = await extractTextFromPDF(buffer)
      const parsedData = await parseInvoiceWithAI(text)

      return NextResponse.json({
        buffer: buffer.toString('base64'),
        size: buffer.length,
        parsedData,
      })
    }

    // Otherwise just return the buffer
    return NextResponse.json({
      buffer: buffer.toString('base64'),
      size: buffer.length,
    })
  } catch (error: any) {
    console.error('❌ Error downloading/parsing PDF:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process PDF' },
      { status: 500 }
    )
  }
}
