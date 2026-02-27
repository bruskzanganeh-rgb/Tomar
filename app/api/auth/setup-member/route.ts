import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { full_name, phone } = await request.json()

  const admin = createAdminClient()

  // Update company_settings: mark onboarding complete + save personal info
  const update: Record<string, unknown> = {
    onboarding_completed: true,
  }
  if (full_name) update.company_name = full_name
  if (phone) update.phone = phone

  const { error } = await admin
    .from('company_settings')
    .update(update)
    .eq('user_id', user.id)

  if (error) {
    // If no row exists, upsert
    const { error: upsertError } = await admin
      .from('company_settings')
      .upsert({
        user_id: user.id,
        company_name: full_name || '',
        org_number: '',
        address: '',
        email: user.email || '',
        phone: phone || '',
        bank_account: '',
        base_currency: 'SEK',
        onboarding_completed: true,
      }, { onConflict: 'user_id' })

    if (upsertError) {
      return NextResponse.json({ error: 'Could not save settings' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
