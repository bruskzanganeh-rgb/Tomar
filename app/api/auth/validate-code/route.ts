import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { code } = await request.json()

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ valid: false }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await supabase
    .from('invitation_codes')
    .select('id, code, max_uses, use_count, expires_at')
    .eq('code', code.trim().toUpperCase())
    .single()

  if (error || !data) {
    return NextResponse.json({ valid: false })
  }

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'expired' })
  }

  // Check usage limit
  if (data.use_count >= data.max_uses) {
    return NextResponse.json({ valid: false, reason: 'used' })
  }

  return NextResponse.json({ valid: true })
}
