import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { token } = body

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  // Check if user already belongs to a company
  const { data: existingMembership } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .single()

  if (existingMembership) {
    return NextResponse.json({ error: 'Already a member of a company' }, { status: 400 })
  }

  // Look up invitation using admin client (user can't see invitations they're not part of)
  const adminSupabase = createAdminClient()

  const { data: invitation, error: invError } = await adminSupabase
    .from('company_invitations')
    .select('id, company_id, invited_email, used_by, expires_at')
    .eq('token', token)
    .single()

  if (invError || !invitation) {
    return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
  }

  // Check expiry
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invitation expired' }, { status: 410 })
  }

  // Check if already used
  if (invitation.used_by) {
    return NextResponse.json({ error: 'Invitation already used' }, { status: 410 })
  }

  // Check email restriction
  if (invitation.invited_email && invitation.invited_email !== user.email) {
    return NextResponse.json({ error: 'Invitation is for a different email' }, { status: 403 })
  }

  // Add user as company member
  const { error: memberError } = await adminSupabase
    .from('company_members')
    .insert({
      company_id: invitation.company_id,
      user_id: user.id,
      role: 'member',
    })

  if (memberError) {
    console.error('Error adding member:', memberError)
    return NextResponse.json({ error: 'Could not join company' }, { status: 500 })
  }

  // Mark invitation as used
  await adminSupabase
    .from('company_invitations')
    .update({ used_by: user.id, used_at: new Date().toISOString() })
    .eq('id', invitation.id)

  // Get company name for response
  const { data: company } = await adminSupabase
    .from('companies')
    .select('company_name')
    .eq('id', invitation.company_id)
    .single()

  return NextResponse.json({
    success: true,
    company_name: company?.company_name || '',
    company_id: invitation.company_id,
  })
}
