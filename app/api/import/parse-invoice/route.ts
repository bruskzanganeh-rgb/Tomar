import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromPDF } from '@/lib/pdf/extractor'
import { parseInvoiceWithAI } from '@/lib/pdf/parser'
import { matchClient } from '@/lib/import/client-matcher'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { success } = rateLimit(`parse:${ip}`, 10, 60_000)
  if (!success) return rateLimitResponse()

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const invoiceNumber = formData.get('invoiceNumber') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Step 1: Extract text from PDF
    const extractedText = await extractTextFromPDF(buffer)

    if (extractedText.length < 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'PDF text extraction failed or document too short. May need OCR.',
          rawText: extractedText,
        },
        { status: 422 }
      )
    }

    // Step 2: Parse with AI
    const parsedData = await parseInvoiceWithAI(extractedText)

    // Override invoice number if provided
    if (invoiceNumber) {
      parsedData.invoiceNumber = parseInt(invoiceNumber, 10)
    }

    // Step 3: Match client
    const clientMatch = await matchClient(parsedData.clientName)

    return NextResponse.json({
      success: true,
      data: {
        ...parsedData,
        clientMatch,
        rawText: extractedText.substring(0, 500), // First 500 chars for debugging
      },
    })
  } catch (error: any) {
    console.error('Error parsing invoice:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to parse invoice',
      },
      { status: 500 }
    )
  }
}
