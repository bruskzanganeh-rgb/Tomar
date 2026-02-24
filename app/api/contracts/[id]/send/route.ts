import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logContractEvent } from '@/lib/contracts/audit'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { Resend } from 'resend'

async function requireAdmin(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: isAdmin } = await supabase.rpc('is_admin', { uid: user.id })
  if (!isAdmin) return null
  return user
}

// POST /api/contracts/[id]/send — Send signing link via email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { success } = rateLimit(`contract-send:${ip}`, 5, 60_000)
  if (!success) return rateLimitResponse()

  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const adminClient = createAdminClient()

  const { data: contract, error } = await adminClient
    .from('contracts')
    .select('*, company:companies(company_name)')
    .eq('id', id)
    .single()

  if (error || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  if (!['draft', 'sent'].includes(contract.status)) {
    return NextResponse.json({ error: 'Contract cannot be sent in current status' }, { status: 400 })
  }

  // Generate signing token (64 hex chars)
  const signingToken = randomBytes(32).toString('hex')
  const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  // Update contract
  const isResend = contract.status === 'sent'
  await adminClient
    .from('contracts')
    .update({
      signing_token: signingToken,
      token_expires_at: tokenExpiresAt.toISOString(),
      status: 'sent',
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  // Send email via Resend
  const { data: configRows } = await adminClient
    .from('platform_config')
    .select('key, value')
    .in('key', ['resend_api_key', 'resend_from_email'])

  const config = Object.fromEntries((configRows || []).map((r: { key: string; value: string }) => [r.key, r.value]))

  if (!config.resend_api_key) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '')
  const signUrl = `${baseUrl}/sign/${signingToken}`
  const companyName = (contract.company as unknown as { company_name: string } | null)?.company_name || 'N/A'

  const resend = new Resend(config.resend_api_key)
  const { error: emailError } = await resend.emails.send({
    from: config.resend_from_email || 'noreply@amida.se',
    to: contract.signer_email,
    subject: `Agreement Ready for Signing — ${contract.contract_number}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #111827; margin-bottom: 8px;">Subscription Agreement</h2>
        <p style="color: #6b7280; font-size: 14px;">Agreement ${contract.contract_number} is ready for your review and signature.</p>

        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; font-size: 14px; color: #111827;">
            <tr><td style="padding: 4px 0; color: #6b7280;">Organization</td><td style="padding: 4px 0; font-weight: 600;">${companyName}</td></tr>
            <tr><td style="padding: 4px 0; color: #6b7280;">Tier</td><td style="padding: 4px 0; font-weight: 600;">${contract.tier}</td></tr>
            <tr><td style="padding: 4px 0; color: #6b7280;">Annual Price</td><td style="padding: 4px 0; font-weight: 600;">${contract.annual_price} ${contract.currency}</td></tr>
            <tr><td style="padding: 4px 0; color: #6b7280;">Duration</td><td style="padding: 4px 0; font-weight: 600;">${contract.contract_duration_months} months</td></tr>
          </table>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${signUrl}" style="display: inline-block; background: #111827; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Review and Sign Agreement
          </a>
        </div>

        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This link expires on ${tokenExpiresAt.toLocaleDateString('sv-SE')}.<br/>
          If you did not expect this email, please disregard it.
        </p>
      </div>
    `,
  })

  if (emailError) {
    console.error('Failed to send contract email:', emailError)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  // Audit log
  await logContractEvent(adminClient, {
    contract_id: id,
    event_type: isResend ? 'resent' : 'sent',
    actor_email: user.email,
    ip_address: ip,
    document_hash_sha256: contract.document_hash_sha256,
    metadata: { signer_email: contract.signer_email, token_expires_at: tokenExpiresAt.toISOString() },
  })

  return NextResponse.json({ success: true, sent_to: contract.signer_email })
}
