import { verifyAdmin } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createOrgSchema } from '@/lib/schemas/admin'

export async function GET() {
  const auth = await verifyAdmin()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  type OrgRow = {
    id: string
    name: string
    category: string | null
    notes: string | null
    created_at: string
    organization_members: { id: string; user_id: string; role: string | null; joined_at: string | null }[]
  }

  const { data, error } = await supabase
    .from('organizations')
    .select('*, organization_members(id, user_id, role, joined_at)')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const orgs = (data || []) as unknown as OrgRow[]

  // Enrich members with user info
  const allUserIds = orgs.flatMap((o) => (o.organization_members || []).map((m) => m.user_id))
  const uniqueUserIds = [...new Set(allUserIds)]

  let settingsMap = new Map<string, { user_id: string; company_name: string | null; email: string | null }>()
  if (uniqueUserIds.length > 0) {
    const { data: settings } = await supabase
      .from('company_settings')
      .select('user_id, company_name, email')
      .in('user_id', uniqueUserIds)
    settingsMap = new Map((settings || []).map((s) => [s.user_id, s] as const)) as typeof settingsMap
  }

  const organizations = orgs.map((org) => ({
    ...org,
    organization_members: (org.organization_members || []).map((m) => ({
      ...m,
      company_name: settingsMap.get(m.user_id)?.company_name || null,
      email: settingsMap.get(m.user_id)?.email || null,
    })),
    member_count: (org.organization_members || []).length,
  }))

  return NextResponse.json({ organizations })
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  const body = await request.json()
  const parsed = createOrgSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { name, category, notes } = parsed.data

  const { data, error } = await supabase
    .from('organizations')
    .insert({ name, category: category || null, notes: notes || null })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ organization: data })
}
