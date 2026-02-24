import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { downloadContractFile } from '@/lib/contracts/storage'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

async function requireAdmin(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: isAdmin } = await supabase.rpc('is_admin', { uid: user.id })
  if (!isAdmin) return null
  return user
}

// GET /api/contracts/[id]/pdf?type=unsigned|signed
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { success } = rateLimit(`contract-pdf:${ip}`, 20, 60_000)
  if (!success) return rateLimitResponse()

  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'unsigned'

  const adminClient = createAdminClient()

  const { data: contract } = await adminClient
    .from('contracts')
    .select('unsigned_pdf_path, signed_pdf_path, contract_number')
    .eq('id', id)
    .single()

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

  const path = type === 'signed' ? contract.signed_pdf_path : contract.unsigned_pdf_path
  if (!path) return NextResponse.json({ error: `No ${type} PDF available` }, { status: 404 })

  const buffer = await downloadContractFile(adminClient, path)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${contract.contract_number}-${type}.pdf"`,
    },
  })
}
