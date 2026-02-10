import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      smtp_host,
      smtp_port,
      smtp_user,
      smtp_password,
      smtp_from_email,
      smtp_from_name,
      to_email,
    } = body

    // Validera input
    if (!smtp_host || !smtp_from_email || !to_email) {
      return NextResponse.json(
        { error: 'SMTP host, sender email and recipient required' },
        { status: 400 }
      )
    }

    // Skapa transporter
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: smtp_port || 587,
      secure: smtp_port === 465,
      auth: smtp_user ? {
        user: smtp_user,
        pass: smtp_password || '',
      } : undefined,
    })

    // Verifiera anslutning
    await transporter.verify()

    // Skicka testmail
    const fromAddress = smtp_from_name
      ? `"${smtp_from_name}" <${smtp_from_email}>`
      : smtp_from_email

    await transporter.sendMail({
      from: fromAddress,
      to: to_email,
      subject: 'Test av SMTP-inställningar',
      text: 'Detta är ett testmail från Babalisk Manager för att verifiera att SMTP-inställningarna fungerar korrekt.',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #111827;">SMTP-test lyckades!</h2>
          <p style="color: #6b7280;">
            Detta mail bekräftar att dina SMTP-inställningar i Babalisk Manager är korrekt konfigurerade.
          </p>
          <p style="color: #6b7280;">
            Du kan nu skicka fakturor via e-post direkt från systemet.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px;">
            Skickat från Babalisk Manager
          </p>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      message: 'Test email sent!',
    })
  } catch (error) {
    console.error('Test email error:', error)

    // Ge mer användbar feedback vid vanliga fel
    let errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (errorMessage.includes('ECONNREFUSED')) {
      errorMessage = 'Could not connect to SMTP server. Check host and port.'
    } else if (errorMessage.includes('EAUTH') || errorMessage.includes('Invalid login')) {
      errorMessage = 'Invalid username or password.'
    } else if (errorMessage.includes('ESOCKET') || errorMessage.includes('timeout')) {
      errorMessage = 'Connection timeout. Check host and port.'
    } else if (errorMessage.includes('certificate')) {
      errorMessage = 'SSL/TLS certificate error. Try another port (587 or 465).'
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
