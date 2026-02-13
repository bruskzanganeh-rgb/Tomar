import { createClient } from '@/lib/supabase/server'
import { incrementUsage, checkUsageLimit } from '@/lib/usage'
import { NextResponse } from 'next/server'
import { incrementUsageSchema } from '@/lib/schemas/usage'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = incrementUsageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const { type } = parsed.data

  // Check limit first
  const { allowed } = await checkUsageLimit(user.id, type)
  if (!allowed) {
    return NextResponse.json({ error: 'Limit reached' }, { status: 403 })
  }

  await incrementUsage(user.id, type)

  return NextResponse.json({ ok: true })
}
