import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import { logActivity } from '@/lib/activity'

// Service role client for platform config and status updates
const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { invoiceId, to, subject, message, attachmentUrls } = body

    if (!invoiceId || !to || !subject) {
      return NextResponse.json(
        { error: 'invoiceId, to and subject required' },
        { status: 400 }
      )
    }

    // Fetch invoice - verify ownership
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*, client:clients(name, email)')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Check Pro plan
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single()

    if (!subscription || subscription.plan !== 'pro' || subscription.status !== 'active') {
      return NextResponse.json({ error: 'Pro plan required to send emails' }, { status: 403 })
    }

    // Fetch company settings
    const { data: company, error: companyError } = await supabase
      .from('company_settings')
      .select('smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, company_name, email_provider')
      .eq('user_id', user.id)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Could not fetch company settings' }, { status: 500 })
    }

    // Generate PDF
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const pdfResponse = await fetch(`${baseUrl}/api/invoices/${invoiceId}/pdf`)
    if (!pdfResponse.ok) {
      return NextResponse.json({ error: 'Could not generate PDF for the invoice' }, { status: 500 })
    }
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())

    // Build attachments
    const fileAttachments: { filename: string; content: Buffer; contentType: string }[] = [
      {
        filename: `Faktura-${invoice.invoice_number}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ]

    if (attachmentUrls && attachmentUrls.length > 0) {
      for (let i = 0; i < attachmentUrls.length; i++) {
        try {
          const attachmentResponse = await fetch(attachmentUrls[i])
          if (attachmentResponse.ok) {
            const attachmentBuffer = Buffer.from(await attachmentResponse.arrayBuffer())
            const contentType = attachmentResponse.headers.get('content-type') || 'application/octet-stream'
            const extension = contentType.includes('pdf') ? 'pdf' : contentType.includes('png') ? 'png' : 'jpg'
            fileAttachments.push({
              filename: `Kvitto-${i + 1}.${extension}`,
              content: attachmentBuffer,
              contentType,
            })
          }
        } catch (e) {
          console.warn(`Could not fetch attachment ${i + 1}:`, e)
        }
      }
    }

    const provider = company.email_provider || 'platform'
    const htmlBody = message ? `<p>${message.replace(/\n/g, '<br>')}</p>` : undefined

    if (provider === 'platform') {
      // Send via Resend (platform email) - use service role for platform config
      const { data: configRows } = await serviceSupabase
        .from('platform_config')
        .select('key, value')
        .in('key', ['resend_api_key', 'resend_from_email'])

      const config = Object.fromEntries((configRows || []).map(r => [r.key, r.value]))

      if (!config.resend_api_key) {
        return NextResponse.json({ error: 'Platform email is not configured. Contact admin.' }, { status: 400 })
      }

      const resend = new Resend(config.resend_api_key)
      const fromEmail = config.resend_from_email || 'noreply@babalisk.com'
      const fromName = company.company_name || 'Tomar'
      const fromAddress = `${fromName} <${fromEmail}>`

      await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject,
        text: message || '',
        html: htmlBody,
        attachments: fileAttachments.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      })
    } else {
      // Send via SMTP (user's own)
      if (!company.smtp_host || !company.smtp_from_email) {
        return NextResponse.json(
          { error: 'SMTP is not configured. Go to Settings and fill in email details.' },
          { status: 400 }
        )
      }

      const transporter = nodemailer.createTransport({
        host: company.smtp_host,
        port: company.smtp_port || 587,
        secure: company.smtp_port === 465,
        auth: company.smtp_user ? {
          user: company.smtp_user,
          pass: company.smtp_password || '',
        } : undefined,
      })

      const fromAddress = company.smtp_from_name
        ? `"${company.smtp_from_name}" <${company.smtp_from_email}>`
        : company.smtp_from_email

      await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text: message || '',
        html: htmlBody,
        attachments: fileAttachments.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      })
    }

    // Update invoice status - scope to user for safety
    if (invoice.status === 'draft') {
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoiceId)
        .eq('user_id', user.id)
    }

    // Log activity
    if (user.id) {
      await logActivity({
        userId: user.id,
        eventType: 'invoice_sent',
        entityType: 'invoice',
        entityId: invoiceId,
        metadata: { to, invoice_number: invoice.invoice_number, provider },
      })
    }

    return NextResponse.json({ success: true, message: 'Invoice sent!' })
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not send email' },
      { status: 500 }
    )
  }
}
