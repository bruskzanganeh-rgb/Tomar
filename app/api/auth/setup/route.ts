import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { authSetupSchema } from '@/lib/schemas/auth'

// Uses service_role key to bypass RLS — needed because after signUp()
// there's no session yet (email confirmation required), so auth.uid() is NULL.
export async function POST(request: Request) {
  const body = await request.json()
  const parsed = authSetupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  const { user_id, company_name, invitation_code } = parsed.data

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Verify the user exists in auth.users
  const { data: user } = await supabase.auth.admin.getUserById(user_id)
  if (!user?.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Check if setup already ran (idempotent)
  const { count } = await supabase
    .from('company_settings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user_id)

  if (count && count > 0) {
    return NextResponse.json({ ok: true, message: 'Already set up' })
  }

  // Create company_settings (all NOT NULL text columns need empty-string defaults)
  await supabase.from('company_settings').insert({
    user_id,
    company_name: company_name || '',
    org_number: '',
    address: '',
    email: '',
    phone: '',
    bank_account: '',
    base_currency: 'SEK',
    onboarding_completed: false,
  })

  // Create free subscription
  await supabase.from('subscriptions').insert({
    user_id,
    plan: 'free',
    status: 'active',
  })

  // Gig types + positions are created during onboarding (quick-add presets)

  // Claim any orphaned data (user_id IS NULL rows from before auth was added)
  await supabase.rpc('claim_orphaned_data', { uid: user_id })

  // Track invitation code usage
  if (invitation_code) {
    await supabase.rpc('use_invitation_code', {
      code_value: invitation_code.trim().toUpperCase(),
      uid: user_id,
    })
  }

  return NextResponse.json({ ok: true })
}
