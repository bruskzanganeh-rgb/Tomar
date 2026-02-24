import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createContractSchema } from '@/lib/contracts/schemas'
import { generateContractNumber } from '@/lib/contracts/contract-number'
import { generateContractPdf } from '@/lib/pdf/contract-generator'
import { uploadContractPdf } from '@/lib/contracts/storage'
import { sha256 } from '@/lib/contracts/hash'
import { logContractEvent } from '@/lib/contracts/audit'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

async function requireAdmin(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: isAdmin } = await supabase.rpc('is_admin', { uid: user.id })
  if (!isAdmin) return null
  return user
}

// GET /api/contracts — List all contracts (admin only)
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { success } = rateLimit(`contracts-list:${ip}`, 30, 60_000)
  if (!success) return rateLimitResponse()

  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const companyId = searchParams.get('company_id')

  let query = adminClient
    .from('contracts')
    .select('*, company:companies(company_name, org_number)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (companyId) query = query.eq('company_id', companyId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// POST /api/contracts — Create a new contract draft (admin only)
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { success } = rateLimit(`contracts-create:${ip}`, 10, 60_000)
  if (!success) return rateLimitResponse()

  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createContractSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const contractNumber = await generateContractNumber(adminClient)

  // Fetch company info for PDF
  let companyInfo = { company_name: null as string | null, org_number: null as string | null, address: null as string | null }
  if (parsed.data.company_id) {
    const { data: company } = await adminClient
      .from('companies')
      .select('company_name, org_number, address')
      .eq('id', parsed.data.company_id)
      .single()
    if (company) companyInfo = company
  }

  // Insert contract
  const { data: contract, error: insertError } = await adminClient
    .from('contracts')
    .insert({
      ...parsed.data,
      contract_number: contractNumber,
      status: 'draft',
    })
    .select()
    .single()

  if (insertError || !contract) {
    return NextResponse.json({ error: insertError?.message || 'Failed to create contract' }, { status: 500 })
  }

  // Generate unsigned PDF
  const pdfBuffer = await generateContractPdf({
    contractNumber,
    tier: parsed.data.tier,
    annualPrice: parsed.data.annual_price,
    currency: parsed.data.currency || 'SEK',
    billingInterval: parsed.data.billing_interval || 'annual',
    vatRatePct: parsed.data.vat_rate_pct ?? 25,
    contractStartDate: parsed.data.contract_start_date,
    contractDurationMonths: parsed.data.contract_duration_months ?? 12,
    customTerms: parsed.data.custom_terms || {},
    signerName: parsed.data.signer_name,
    signerEmail: parsed.data.signer_email,
    signerTitle: parsed.data.signer_title,
    companyName: companyInfo.company_name,
    companyOrgNumber: companyInfo.org_number,
    companyAddress: companyInfo.address,
  })

  const hash = sha256(pdfBuffer)
  const pdfPath = await uploadContractPdf(
    adminClient,
    parsed.data.company_id || null,
    contract.id,
    'unsigned.pdf',
    pdfBuffer
  )

  // Update contract with PDF path and hash
  await adminClient
    .from('contracts')
    .update({
      unsigned_pdf_path: pdfPath,
      document_hash_sha256: hash,
    })
    .eq('id', contract.id)

  // Audit log
  await logContractEvent(adminClient, {
    contract_id: contract.id,
    event_type: 'created',
    actor_email: user.email,
    ip_address: ip,
    document_hash_sha256: hash,
    metadata: { contract_number: contractNumber },
  })

  return NextResponse.json({ ...contract, unsigned_pdf_path: pdfPath, document_hash_sha256: hash })
}
