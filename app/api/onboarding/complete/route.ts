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

  const { company_info, instruments_text, gig_types, positions } = parsed.data

  let companyId: string | null = null

  // Check if user already has a company (joining via invite)
  const { data: existingMembership } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .single()

  if (existingMembership) {
    companyId = existingMembership.company_id
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

    companyId = newCompany.id

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

  // Update company_settings (personal prefs + instruments text)
  const settingsUpdate: Record<string, unknown> = {
    onboarding_completed: true,
    country_code: company_info.country_code,
  }
  if (instruments_text !== undefined) {
    settingsUpdate.instruments_text = instruments_text
  }

  const { error: settingsError } = await supabase
    .from('company_settings')
    .update(settingsUpdate)
    .eq('user_id', user.id)

  if (settingsError) {
    console.error('Onboarding settings error:', settingsError)
    return NextResponse.json({ error: 'Could not save settings' }, { status: 500 })
  }

  // Insert gig types (now that company_id is available via company_members)
  if (gig_types && gig_types.length > 0 && companyId) {
    const { error: gtError } = await supabase
      .from('gig_types')
      .insert(
        gig_types.map(gt => ({
          name: gt.name,
          name_en: gt.name_en || '',
          vat_rate: gt.vat_rate ?? 0,
          color: gt.color || '#6b7280',
          company_id: companyId,
        }))
      )

    if (gtError) {
      console.error('Error saving gig types:', gtError)
    }
  }

  // Insert positions (now that company_id is available via company_members)
  if (positions && positions.length > 0 && companyId) {
    const { error: posError } = await supabase
      .from('positions')
      .insert(
        positions.map(p => ({
          name: p.name,
          sort_order: p.sort_order,
          company_id: companyId,
        }))
      )

    if (posError) {
      console.error('Error saving positions:', posError)
    }
  }

  // Ensure subscription exists (free plan) — linked to user's company
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
      company_id: companyId,
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
