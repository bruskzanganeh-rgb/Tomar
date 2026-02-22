import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user is a company owner
  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') {
    return NextResponse.json({ error: 'Only company owners can create invitations' }, { status: 403 })
  }

  // Check team subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('company_id', membership.company_id)
    .single()

  if (!subscription || subscription.plan !== 'team' || subscription.status !== 'active') {
    return NextResponse.json({ error: 'Team plan required to invite members' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { email } = body

  // Create invitation
  const { data: invitation, error } = await supabase
    .from('company_invitations')
    .insert({
      company_id: membership.company_id,
      invited_by: user.id,
      invited_email: email || null,
    })
    .select('id, token, expires_at')
    .single()

  if (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json({ error: 'Could not create invitation' }, { status: 500 })
  }

  const baseUrl = request.headers.get('origin') || ''
  const inviteUrl = `${baseUrl}/signup?invite=${invitation.token}`

  return NextResponse.json({
    token: invitation.token,
    url: inviteUrl,
    expires_at: invitation.expires_at,
  })
}
