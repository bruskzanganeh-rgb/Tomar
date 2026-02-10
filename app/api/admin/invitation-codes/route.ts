import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: isAdmin } = await supabase.rpc('is_admin', { uid: user.id })
  if (!isAdmin) return null

  return user
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('invitation_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ codes: data })
}

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code, max_uses, expires_at } = await request.json()

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 })
  }

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('invitation_codes')
    .insert({
      code: code.trim().toUpperCase(),
      max_uses: max_uses || 1,
      expires_at: expires_at || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Code already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ code: data })
}

export async function DELETE(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const supabase = getServiceClient()
  const { error } = await supabase
    .from('invitation_codes')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
