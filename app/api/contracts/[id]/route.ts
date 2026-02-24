import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateContractSchema } from '@/lib/contracts/schemas'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

async function requireAdmin(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: isAdmin } = await supabase.rpc('is_admin', { uid: user.id })
  if (!isAdmin) return null
  return user
}

// GET /api/contracts/[id] — Get contract with audit trail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { success } = rateLimit(`contract-get:${ip}`, 30, 60_000)
  if (!success) return rateLimitResponse()

  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const adminClient = createAdminClient()

  const { data: contract, error } = await adminClient
    .from('contracts')
    .select('*, company:companies(company_name, org_number, address)')
    .eq('id', id)
    .single()

  if (error || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  // Fetch audit trail
  const { data: auditTrail } = await adminClient
    .from('contract_audit')
    .select('*')
    .eq('contract_id', id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ ...contract, audit_trail: auditTrail || [] })
}

// PATCH /api/contracts/[id] — Update draft contract
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { success } = rateLimit(`contract-update:${ip}`, 10, 60_000)
  if (!success) return rateLimitResponse()

  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const adminClient = createAdminClient()

  // Check current status
  const { data: existing } = await adminClient
    .from('contracts')
    .select('status')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  if (existing.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft contracts can be edited' }, { status: 400 })
  }

  const body = await request.json()
  const parsed = updateContractSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data: updated, error } = await adminClient
    .from('contracts')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(updated)
}
