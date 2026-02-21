import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseScheduleWithVision, parseScheduleWithText, sessionsToText } from '@/lib/schedule/parser'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { extractText, renderPageAsImage } from 'unpdf'

async function pdfToBase64Image(buffer: ArrayBuffer): Promise<string> {
  const bufferCopy = buffer.slice(0)
  const uint8Array = new Uint8Array(bufferCopy)

  const imageArrayBuffer = await renderPageAsImage(uint8Array, 1, {
    scale: 2.0,
    canvasImport: () => import('@napi-rs/canvas'),
  })

  const bytes = new Uint8Array(imageArrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return Buffer.from(binary, 'binary').toString('base64')
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { success } = rateLimit(`schedule-scan:${ip}`, 10, 60_000)
  if (!success) return rateLimitResponse()

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const isPdf = file.type === 'application/pdf'

    if (!validImageTypes.includes(file.type) && !isPdf) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, WebP, and PDF are supported.' },
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File is too large. Max 10MB.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    let result

    if (isPdf) {
      try {
        const bufferCopy = arrayBuffer.slice(0)
        const { text: textArray } = await extractText(new Uint8Array(bufferCopy))
        const text = textArray.join('\n')

        if (text && text.trim().length >= 50) {
          result = await parseScheduleWithText(text, user.id)
        } else {
          const base64Image = await pdfToBase64Image(arrayBuffer)
          result = await parseScheduleWithVision(base64Image, 'image/png', user.id)
        }
      } catch (pdfError) {
        console.error('PDF text extraction failed, trying image conversion:', pdfError)
        try {
          const base64Image = await pdfToBase64Image(arrayBuffer)
          result = await parseScheduleWithVision(base64Image, 'image/png', user.id)
        } catch (imageError) {
          console.error('PDF image conversion also failed:', imageError)
          return NextResponse.json(
            { error: 'Could not read the PDF file. Try an image instead.' },
            { status: 400 }
          )
        }
      }
    } else {
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const base64 = Buffer.from(binary, 'binary').toString('base64')
      const mimeType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      result = await parseScheduleWithVision(base64, mimeType, user.id)
    }

    // Convert sessions to text for display in text fields
    const scheduleTexts: Record<string, string> = {}
    for (const [date, sessions] of Object.entries(result.dates)) {
      scheduleTexts[date] = sessionsToText(sessions)
    }

    return NextResponse.json({
      success: true,
      dates: result.dates,
      scheduleTexts,
      projectName: result.project_name,
      venue: result.venue,
      confidence: result.confidence,
    })
  } catch (error) {
    console.error('Schedule scan error:', error)
    return NextResponse.json(
      { error: 'Could not read schedule' },
      { status: 500 }
    )
  }
}
