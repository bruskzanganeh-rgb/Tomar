import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { success } = rateLimit(`translate:${ip}`, 20, 60_000)
  if (!success) return rateLimitResponse()

  // Auth check
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { translateSchema } = await import('@/lib/schemas/translate')
  const parsed = translateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  const { text, targetLang } = parsed.data

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `Translate the following music-related term to ${targetLang === 'en' ? 'English' : targetLang}. Reply with ONLY the translation, nothing else.\n\n"${text.trim()}"`,
        },
      ],
    })

    const translation = (message.content[0] as { type: string; text: string }).text.trim().replace(/^["']|["']$/g, '')

    return NextResponse.json({ translation })
  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}
