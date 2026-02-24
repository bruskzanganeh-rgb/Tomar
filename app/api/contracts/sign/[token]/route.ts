import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signContractSchema } from '@/lib/contracts/schemas'
import { generateContractPdf } from '@/lib/pdf/contract-generator'
import { uploadContractPdf, uploadSignatureImage } from '@/lib/contracts/storage'
import { sha256 } from '@/lib/contracts/hash'
import { logContractEvent } from '@/lib/contracts/audit'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { Resend } from 'resend'

function getClientInfo(request: NextRequest) {
  return {
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  }
}

// GET /api/contracts/sign/[token] — Public: get contract data for signing page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { ip } = getClientInfo(request)
  const { success } = rateLimit(`contract-view:${ip}`, 10, 60_000)
  if (!success) return rateLimitResponse()

  const { token } = await params
  const adminClient = createAdminClient()

  const { data: contract, error } = await adminClient
    .from('contracts')
    .select('id, contract_number, tier, annual_price, currency, billing_interval, vat_rate_pct, contract_start_date, contract_duration_months, custom_terms, signer_name, signer_email, signer_title, status, token_expires_at, document_hash_sha256, unsigned_pdf_path, company:companies(company_name, org_number, address)')
    .eq('signing_token', token)
    .single()

  if (error || !contract) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
  }

  // Check token expiry
  if (contract.token_expires_at && new Date(contract.token_expires_at) < new Date()) {
    // Mark as expired
    await adminClient
      .from('contracts')
      .update({ status: 'expired' })
      .eq('id', contract.id)
    return NextResponse.json({ error: 'This signing link has expired' }, { status: 410 })
  }

  // Check if already signed
  if (contract.status === 'signed') {
    return NextResponse.json({ error: 'This agreement has already been signed' }, { status: 410 })
  }

  if (contract.status === 'cancelled') {
    return NextResponse.json({ error: 'This agreement has been cancelled' }, { status: 410 })
  }

  // Mark as viewed if first view
  if (contract.status === 'sent') {
    await adminClient
      .from('contracts')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', contract.id)

    await logContractEvent(adminClient, {
      contract_id: contract.id,
      event_type: 'viewed',
      actor_email: contract.signer_email,
      ip_address: ip,
      document_hash_sha256: contract.document_hash_sha256,
    })
  }

  // Generate a signed URL for the PDF
  let pdfUrl: string | null = null
  if (contract.unsigned_pdf_path) {
    const { data } = await adminClient.storage
      .from('contracts')
      .createSignedUrl(contract.unsigned_pdf_path, 3600)
    pdfUrl = data?.signedUrl || null
  }

  return NextResponse.json({
    contract_number: contract.contract_number,
    tier: contract.tier,
    annual_price: contract.annual_price,
    currency: contract.currency,
    billing_interval: contract.billing_interval,
    vat_rate_pct: contract.vat_rate_pct,
    contract_start_date: contract.contract_start_date,
    contract_duration_months: contract.contract_duration_months,
    custom_terms: contract.custom_terms,
    signer_name: contract.signer_name,
    signer_email: contract.signer_email,
    signer_title: contract.signer_title,
    company_name: (contract.company as unknown as { company_name: string } | null)?.company_name || null,
    document_hash: contract.document_hash_sha256,
    pdf_url: pdfUrl,
    status: contract.status,
  })
}

// POST /api/contracts/sign/[token] — Public: submit signature
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { ip, userAgent } = getClientInfo(request)
  const { success } = rateLimit(`contract-sign:${ip}`, 3, 60_000)
  if (!success) return rateLimitResponse()

  const { token } = await params
  const adminClient = createAdminClient()

  // Fetch contract
  const { data: contract, error } = await adminClient
    .from('contracts')
    .select('*, company:companies(company_name, org_number, address)')
    .eq('signing_token', token)
    .single()

  if (error || !contract) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
  }

  if (contract.token_expires_at && new Date(contract.token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'This signing link has expired' }, { status: 410 })
  }

  if (contract.status === 'signed') {
    return NextResponse.json({ error: 'This agreement has already been signed' }, { status: 410 })
  }

  if (!['sent', 'viewed'].includes(contract.status)) {
    return NextResponse.json({ error: 'Contract cannot be signed in current status' }, { status: 400 })
  }

  // Validate signature payload
  const body = await request.json()
  const parsed = signContractSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const signedAt = new Date().toISOString()

  // Upload signature image
  const signatureImagePath = await uploadSignatureImage(
    adminClient,
    contract.company_id,
    contract.id,
    parsed.data.signature_image
  )

  // Generate signed PDF with embedded signature
  const companyInfo = contract.company as unknown as { company_name: string | null; org_number: string | null; address: string | null } | null
  const signedPdfBuffer = await generateContractPdf({
    contractNumber: contract.contract_number,
    tier: contract.tier,
    annualPrice: Number(contract.annual_price),
    currency: contract.currency,
    billingInterval: contract.billing_interval,
    vatRatePct: Number(contract.vat_rate_pct),
    contractStartDate: contract.contract_start_date,
    contractDurationMonths: contract.contract_duration_months,
    customTerms: contract.custom_terms || {},
    signerName: parsed.data.signer_name,
    signerEmail: contract.signer_email,
    signerTitle: parsed.data.signer_title,
    companyName: companyInfo?.company_name,
    companyOrgNumber: companyInfo?.org_number,
    companyAddress: companyInfo?.address,
    signed: true,
    signatureImageBase64: parsed.data.signature_image,
    signedAt,
    signerIp: ip,
    documentHash: contract.document_hash_sha256,
  })

  const signedHash = sha256(signedPdfBuffer)
  const signedPdfPath = await uploadContractPdf(
    adminClient,
    contract.company_id,
    contract.id,
    'signed.pdf',
    signedPdfBuffer
  )

  // Update contract
  await adminClient
    .from('contracts')
    .update({
      status: 'signed',
      signed_at: signedAt,
      signed_pdf_path: signedPdfPath,
      signed_document_hash_sha256: signedHash,
      signature_image_path: signatureImagePath,
      signer_name: parsed.data.signer_name,
      signer_title: parsed.data.signer_title || contract.signer_title,
      signing_token: null, // Invalidate token
      updated_at: signedAt,
    })
    .eq('id', contract.id)

  // Audit log
  await logContractEvent(adminClient, {
    contract_id: contract.id,
    event_type: 'signed',
    actor_email: contract.signer_email,
    ip_address: ip,
    user_agent: userAgent,
    document_hash_sha256: signedHash,
    metadata: {
      signer_name: parsed.data.signer_name,
      signer_title: parsed.data.signer_title,
      original_hash: contract.document_hash_sha256,
    },
  })

  // Send confirmation emails
  try {
    const { data: configRows } = await adminClient
      .from('platform_config')
      .select('key, value')
      .in('key', ['resend_api_key', 'resend_from_email', 'admin_email'])

    const config = Object.fromEntries((configRows || []).map((r: { key: string; value: string }) => [r.key, r.value]))

    if (config.resend_api_key) {
      const resend = new Resend(config.resend_api_key)
      const fromEmail = config.resend_from_email || 'noreply@amida.se'

      // Confirmation to signer
      await resend.emails.send({
        from: fromEmail,
        to: contract.signer_email,
        subject: `Agreement Signed — ${contract.contract_number}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #111827;">Agreement Signed Successfully</h2>
            <p style="color: #6b7280;">Your subscription agreement <strong>${contract.contract_number}</strong> has been signed.</p>
            <p style="color: #6b7280;">A copy of the signed agreement will be provided by the service administrator.</p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">Document hash: ${signedHash.substring(0, 16)}...</p>
          </div>
        `,
      })

      // Notification to admin
      if (config.admin_email) {
        await resend.emails.send({
          from: fromEmail,
          to: config.admin_email,
          subject: `Contract Signed: ${contract.contract_number}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #111827;">Contract Signed</h2>
              <p style="color: #6b7280;"><strong>${parsed.data.signer_name}</strong> (${contract.signer_email}) has signed contract <strong>${contract.contract_number}</strong>.</p>
              <p style="color: #6b7280;">IP: ${ip} | Time: ${signedAt}</p>
              <p style="color: #6b7280;">View the signed contract in the admin panel.</p>
            </div>
          `,
        })
      }
    }
  } catch (emailErr) {
    console.error('Failed to send confirmation emails:', emailErr)
    // Don't fail the signing just because email failed
  }

  return NextResponse.json({ success: true, signed_at: signedAt })
}
