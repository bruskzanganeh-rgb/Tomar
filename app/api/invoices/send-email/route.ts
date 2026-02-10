import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { logActivity } from '@/lib/activity'

// Supabase client med service role för server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId, to, subject, message, attachmentUrls } = body

    // Validera input
    if (!invoiceId || !to || !subject) {
      return NextResponse.json(
        { error: 'invoiceId, to and subject required' },
        { status: 400 }
      )
    }

    // Hämta fakturainformation
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*, client:clients(name, email)')
      .eq('id', invoiceId)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Hämta SMTP-inställningar
    const { data: company, error: companyError } = await supabase
      .from('company_settings')
      .select('smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, company_name')
      .single()

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Could not fetch company settings' },
        { status: 500 }
      )
    }

    // Kontrollera om SMTP är konfigurerat
    if (!company.smtp_host || !company.smtp_from_email) {
      return NextResponse.json(
        { error: 'SMTP is not configured. Go to Settings and fill in email details.' },
        { status: 400 }
      )
    }

    // Hämta PDF
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const pdfResponse = await fetch(`${baseUrl}/api/invoices/${invoiceId}/pdf`)

    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: 'Could not generate PDF for the invoice' },
        { status: 500 }
      )
    }

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())

    // Skapa nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: company.smtp_host,
      port: company.smtp_port || 587,
      secure: company.smtp_port === 465,
      auth: company.smtp_user ? {
        user: company.smtp_user,
        pass: company.smtp_password || '',
      } : undefined,
    })

    // Bygg bilagor
    const attachments: nodemailer.SendMailOptions['attachments'] = [
      {
        filename: `Faktura-${invoice.invoice_number}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ]

    // Lägg till kvittobilagor om det finns
    if (attachmentUrls && attachmentUrls.length > 0) {
      for (let i = 0; i < attachmentUrls.length; i++) {
        try {
          const attachmentResponse = await fetch(attachmentUrls[i])
          if (attachmentResponse.ok) {
            const attachmentBuffer = Buffer.from(await attachmentResponse.arrayBuffer())
            const contentType = attachmentResponse.headers.get('content-type') || 'application/octet-stream'
            const extension = contentType.includes('pdf') ? 'pdf' : contentType.includes('png') ? 'png' : 'jpg'
            attachments.push({
              filename: `Kvitto-${i + 1}.${extension}`,
              content: attachmentBuffer,
              contentType,
            })
          }
        } catch (e) {
          console.warn(`Kunde inte hämta bilaga ${i + 1}:`, e)
        }
      }
    }

    // Skicka e-post
    const fromAddress = company.smtp_from_name
      ? `"${company.smtp_from_name}" <${company.smtp_from_email}>`
      : company.smtp_from_email

    await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: message || '',
      html: message ? `<p>${message.replace(/\n/g, '<br>')}</p>` : undefined,
      attachments,
    })

    // Uppdatera fakturastatus till 'sent' om den var 'draft'
    if (invoice.status === 'draft') {
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoiceId)
    }

    // Log activity
    if (invoice.user_id) {
      await logActivity({
        userId: invoice.user_id,
        eventType: 'invoice_sent',
        entityType: 'invoice',
        entityId: invoiceId,
        metadata: { to, invoice_number: invoice.invoice_number },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice sent!',
    })
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not send email' },
      { status: 500 }
    )
  }
}
