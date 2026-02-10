import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { company_info, instruments } = await request.json()

  // Update company_settings
  const { error: settingsError } = await supabase
    .from('company_settings')
    .update({
      ...company_info,
      onboarding_completed: true,
    })
    .eq('user_id', user.id)

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 })
  }

  // Insert user instruments
  if (instruments?.length > 0) {
    const { error: instrError } = await supabase
      .from('user_instruments')
      .upsert(
        instruments.map((instrument_id: string) => ({
          user_id: user.id,
          instrument_id,
        })),
        { onConflict: 'user_id,instrument_id' }
      )

    if (instrError) {
      console.error('Error saving instruments:', instrError)
    }
  }

  // Ensure subscription exists (free plan)
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!existingSub) {
    await supabase.from('subscriptions').insert({
      user_id: user.id,
      plan: 'free',
      status: 'active',
    })
  }

  await logActivity({
    userId: user.id,
    eventType: 'onboarding_completed',
    entityType: 'user',
    entityId: user.id,
  })

  return NextResponse.json({ ok: true })
}
