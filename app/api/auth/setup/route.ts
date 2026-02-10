import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Uses service_role key to bypass RLS — needed because after signUp()
// there's no session yet (email confirmation required), so auth.uid() is NULL.
export async function POST(request: Request) {
  const { user_id, company_name } = await request.json()

  if (!user_id) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

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

  // Create company_settings
  await supabase.from('company_settings').insert({
    user_id,
    company_name: company_name || null,
    base_currency: 'SEK',
    onboarding_completed: false,
  })

  // Create free subscription
  await supabase.from('subscriptions').insert({
    user_id,
    plan: 'free',
    status: 'active',
  })

  // Create default gig types
  await supabase.from('gig_types').insert([
    { name: 'Konsert', vat_rate: 0, color: '#3b82f6', is_default: true, user_id },
    { name: 'Inspelning', vat_rate: 6, color: '#8b5cf6', is_default: false, user_id },
    { name: 'Undervisning', vat_rate: 25, color: '#f59e0b', is_default: false, user_id },
  ])

  // Create default positions
  await supabase.from('positions').insert([
    { name: 'Tutti', sort_order: 1, user_id },
  ])

  // Claim any orphaned data (user_id IS NULL rows from before auth was added)
  await supabase.rpc('claim_orphaned_data', { uid: user_id })

  return NextResponse.json({ ok: true })
}
