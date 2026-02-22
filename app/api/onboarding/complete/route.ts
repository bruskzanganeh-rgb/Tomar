import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'
import { completeOnboardingSchema } from '@/lib/schemas/onboarding'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = completeOnboardingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { company_info, instruments } = parsed.data

  // Check if user already has a company (joining via invite)
  const { data: existingMembership } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .single()

  if (existingMembership) {
    // User already belongs to a company (joined via invite) — just update company info if owner
    const { data: member } = await supabase
      .from('company_members')
      .select('role')
      .eq('company_id', existingMembership.company_id)
      .eq('user_id', user.id)
      .single()

    if (member?.role === 'owner') {
      await supabase
        .from('companies')
        .update(company_info)
        .eq('id', existingMembership.company_id)
    }
  } else {
    // Create new company
    const { data: newCompany, error: compError } = await supabase
      .from('companies')
      .insert({
        ...company_info,
      })
      .select('id')
      .single()

    if (compError || !newCompany) {
      console.error('Error creating company:', compError)
      return NextResponse.json({ error: 'Could not create company' }, { status: 500 })
    }

    // Make user the company owner
    const { error: memberError } = await supabase
      .from('company_members')
      .insert({
        company_id: newCompany.id,
        user_id: user.id,
        role: 'owner',
      })

    if (memberError) {
      console.error('Error creating company membership:', memberError)
    }
  }

  // Update company_settings (personal prefs only)
  const { error: settingsError } = await supabase
    .from('company_settings')
    .update({
      onboarding_completed: true,
      country_code: company_info.country_code,
    })
    .eq('user_id', user.id)

  if (settingsError) {
    console.error('Onboarding settings error:', settingsError)
    return NextResponse.json({ error: 'Could not save settings' }, { status: 500 })
  }

  // Insert user instruments
  if (instruments && instruments.length > 0) {
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

  // Ensure subscription exists (free plan) — linked to user's company
  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .single()

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
      company_id: membership?.company_id || null,
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
