import { NextRequest } from 'next/server'
import { validateApiKey, requireScope } from '@/lib/api-auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { parseReceiptWithVision, parseReceiptWithText } from '@/lib/receipt/parser'
import { ALLOWED_RECEIPT_TYPES, MAX_FILE_SIZE } from '@/lib/upload/file-validation'
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
  const authHeader = request.headers.get('authorization')
  const keyId = authHeader?.substring(7, 23) || 'anon'

  // Stricter rate limit for AI scanning (10 req/min)
  if (!rateLimit(`apiv1-scan:${keyId}`, 10, 60_000).success) return rateLimitResponse()

  const auth = await validateApiKey(authHeader)
  if (!auth.success) return apiError(auth.error, auth.status)

  const scopeCheck = requireScope(auth.scopes, 'write:expenses')
  if (!scopeCheck.success) return apiError(scopeCheck.error, scopeCheck.status)

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return apiError('No file uploaded. Send multipart/form-data with field "file".', 400)
    }

    if (!ALLOWED_RECEIPT_TYPES.includes(file.type as typeof ALLOWED_RECEIPT_TYPES[number])) {
      return apiError('Invalid file type. Use PDF or image (JPEG, PNG, WebP, GIF).', 400)
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError('File too large. Max 10 MB.', 400)
    }

    const arrayBuffer = await file.arrayBuffer()
    let result

    if (file.type === 'application/pdf') {
      try {
        const bufferCopy = arrayBuffer.slice(0)
        const { text: textArray } = await extractText(new Uint8Array(bufferCopy))
        const text = textArray.join('\n')

        if (text && text.trim().length >= 50) {
          result = await parseReceiptWithText(text, auth.userId)
        } else {
          const base64Image = await pdfToBase64Image(arrayBuffer)
          result = await parseReceiptWithVision(base64Image, 'image/png', auth.userId)
        }
      } catch {
        try {
          const base64Image = await pdfToBase64Image(arrayBuffer)
          result = await parseReceiptWithVision(base64Image, 'image/png', auth.userId)
        } catch {
          return apiError('Could not read the PDF file. Try an image instead.', 400)
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

      result = await parseReceiptWithVision(base64, mimeType, auth.userId)
    }

    return apiSuccess(result)
  } catch (error) {
    console.error('[API v1] Scan receipt error:', error)
    return apiError('Failed to scan receipt', 500)
  }
}
