import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin'
import { logActivity } from '@/lib/activity'
import { createUserSchema } from '@/lib/schemas/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ownerUserId } = await params
  const auth = await verifyAdmin()
  if (auth instanceof NextResponse) return auth
  const { userId: adminId, supabase } = auth

  const body = await request.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { email, password, mode } = parsed.data

  // Find the company for the owner user
  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', ownerUserId)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'User has no company' }, { status: 400 })
  }

  // Create or invite the new user
  let newUserId: string
  if (mode === 'create') {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error || !newUser.user) {
      return NextResponse.json({ error: error?.message || 'Failed to create user' }, { status: 500 })
    }
    newUserId = newUser.user.id
  } else {
    const { data: invited, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://amida.babalisk.com'}/auth/confirm`,
    })
    if (error || !invited.user) {
      return NextResponse.json({ error: error?.message || 'Failed to invite user' }, { status: 500 })
    }
    newUserId = invited.user.id
  }

  // Get company name for settings
  const { data: company } = await supabase
    .from('companies')
    .select('company_name')
    .eq('id', membership.company_id)
    .single()

  // Create company_settings for new user
  await supabase.from('company_settings').insert({
    user_id: newUserId,
    company_name: company?.company_name || '',
    org_number: '',
    address: '',
    email,
    phone: '',
    bank_account: '',
    base_currency: 'SEK',
    onboarding_completed: false,
  })

  // Add as member of the same company
  const { error: memberError } = await supabase
    .from('company_members')
    .insert({
      company_id: membership.company_id,
      user_id: newUserId,
      role: 'member',
    })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  // Create subscription (same plan as company owner)
  const { data: ownerSub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', ownerUserId)
    .single()

  await supabase.from('subscriptions').insert({
    user_id: newUserId,
    plan: ownerSub?.plan || 'free',
    status: 'active',
    company_id: membership.company_id,
  })

  await logActivity({
    userId: adminId,
    eventType: 'user_created',
    entityType: 'user',
    entityId: newUserId,
    metadata: { email, mode, invited_to_company: membership.company_id },
  })

  return NextResponse.json({ success: true, userId: newUserId, mode })
}
