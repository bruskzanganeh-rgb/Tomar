import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { logAiUsage } from '@/lib/ai/usage-logger'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Schema för extraherad kvittodata
export const ReceiptDataSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  supplier: z.string().min(1),
  amount: z.number().positive(),
  currency: z.enum(['SEK', 'EUR', 'USD', 'GBP', 'DKK', 'NOK']).default('SEK'),
  category: z.enum([
    'Resa',
    'Mat',
    'Hotell',
    'Instrument',
    'Noter',
    'Utrustning',
    'Kontorsmaterial',
    'Telefon',
    'Prenumeration',
    'Övrigt'
  ]).default('Övrigt'),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1),
})

export type ParsedReceiptData = z.infer<typeof ReceiptDataSchema>

const SYSTEM_PROMPT = `Du är en kvittoläsare för ett svenskt bokföringssystem för frilansmusiker.
Extrahera data från kvittobilder med hög noggrannhet.

Regler:
- Datum i ISO-format (YYYY-MM-DD)
- Belopp ska vara TOTALSUMMAN (inklusive moms)
- Gissa valuta baserat på symboler (kr/SEK, €/EUR, $/USD, £/GBP)
- Välj kategori som passar bäst

Kategorier:
- Resa: Tåg, flyg, taxi, bensin, parkering
- Mat: Restaurang, fika, livsmedel
- Hotell: Övernattning, boende
- Instrument: Köp, reparation, tillbehör
- Noter: Notköp, kopior
- Utrustning: Mikrofoner, kablar, stativ
- Kontorsmaterial: Papper, pennor, etc
- Telefon: Mobilräkning, abonnemang
- Prenumeration: Spotify, programvara, etc
- Övrigt: Allt annat

Returnera ENDAST JSON med dessa fält:
- date: datum (YYYY-MM-DD) eller null om otydligt
- supplier: leverantör/butik/företag
- amount: totalbelopp (nummer)
- currency: valuta (SEK/EUR/USD/GBP/DKK/NOK)
- category: kategori från listan ovan
- notes: kort beskrivning av vad som köpts (valfritt)
- confidence: 0-1, din säkerhet

VIKTIGT: Returnera BARA JSON, inget annat.`

export async function parseReceiptWithVision(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  userId?: string
): Promise<ParsedReceiptData> {
  try {
    const model = 'claude-haiku-4-5-20251001'
    const message = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Läs detta kvitto och extrahera data.',
            },
          ],
        },
      ],
    })

    // Log AI usage for cost tracking
    await logAiUsage({
      usageType: 'receipt_scan_vision',
      model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      userId,
    })

    const responseText = message.content[0]?.type === 'text'
      ? message.content[0].text
      : null

    if (!responseText) {
      throw new Error('Inget svar från Claude')
    }

    // Rensa eventuell markdown
    let jsonText = responseText.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '')
    }

    // Parsa JSON
    const parsed = JSON.parse(jsonText)

    // Validera med Zod
    const validated = ReceiptDataSchema.parse(parsed)

    return validated
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Ogiltigt AI-svar: ${error.message}`)
    }
    throw new Error(
      `Kunde inte läsa kvitto: ${error instanceof Error ? error.message : 'Okänt fel'}`
    )
  }
}

/**
 * Parse receipt from extracted text (cheaper than vision)
 */
export async function parseReceiptWithText(text: string, userId?: string): Promise<ParsedReceiptData> {
  try {
    const model = 'claude-haiku-4-5-20251001'
    const message = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Läs denna kvittotext och extrahera data:\n\n${text}`,
        },
      ],
    })

    // Log AI usage for cost tracking
    await logAiUsage({
      usageType: 'receipt_scan_text',
      model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      userId,
    })

    const responseText = message.content[0]?.type === 'text'
      ? message.content[0].text
      : null

    if (!responseText) {
      throw new Error('Inget svar från Claude')
    }

    // Rensa eventuell markdown
    let jsonText = responseText.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '')
    }

    // Parsa JSON
    const parsed = JSON.parse(jsonText)

    // Validera med Zod
    const validated = ReceiptDataSchema.parse(parsed)

    return validated
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Ogiltigt AI-svar: ${error.message}`)
    }
    throw new Error(
      `Kunde inte läsa kvitto: ${error instanceof Error ? error.message : 'Okänt fel'}`
    )
  }
}

// Hjälpfunktion för att konvertera fil till base64
export async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Hjälpfunktion för att få MIME-typ
export function getMimeType(file: File): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  const type = file.type
  if (type === 'image/jpeg' || type === 'image/png' || type === 'image/gif' || type === 'image/webp') {
    return type
  }
  // Default till JPEG om okänd typ
  return 'image/jpeg'
}
