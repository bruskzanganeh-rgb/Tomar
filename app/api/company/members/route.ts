import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current user's company
  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'No company found' }, { status: 404 })
  }

  // Get all members of this company
  const { data: members } = await supabase
    .from('company_members')
    .select('id, user_id, role, joined_at')
    .eq('company_id', membership.company_id)
    .order('joined_at')

  if (!members || members.length === 0) {
    return NextResponse.json({ members: [] })
  }

  // Fetch emails from company_settings for each member
  const userIds = members.map(m => m.user_id)
  const { data: settingsRows } = await supabase
    .from('company_settings')
    .select('user_id, email')
    .in('user_id', userIds)

  const emailMap = new Map(
    (settingsRows || []).map(s => [s.user_id, s.email])
  )

  // Enrich members with emails
  const enrichedMembers = members.map(m => ({
    ...m,
    company_id: membership.company_id,
    email: emailMap.get(m.user_id) || null,
  }))

  return NextResponse.json({ members: enrichedMembers })
}
