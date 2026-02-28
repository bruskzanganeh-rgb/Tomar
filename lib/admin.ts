import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

type AdminAuth = { userId: string; supabase: ReturnType<typeof createAdminClient> }

export async function verifyAdmin(): Promise<AdminAuth | NextResponse> {
  const supabaseAdmin = createAdminClient()
  const serverClient = await createServerClient()
  const {
    data: { user },
  } = await serverClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { uid: user.id })
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return { userId: user.id, supabase: supabaseAdmin }
}
