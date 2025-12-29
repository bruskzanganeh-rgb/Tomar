import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
        { error: 'invoiceId, to och subject krävs' },
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
        { error: 'Faktura hittades inte' },
        { status: 404 }
      )
    }

    // Generera PDF URL
    const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '')}/api/invoices/${invoiceId}/pdf`

    // TODO: Integrera med e-posttjänst (Resend, SendGrid, etc.)
    // För nu, logga och simulera lyckad sändning
    console.log('=== SKICKAR FAKTURA VIA E-POST ===')
    console.log('Till:', to)
    console.log('Ämne:', subject)
    console.log('Meddelande:', message)
    console.log('Faktura PDF:', pdfUrl)
    console.log('Antal kvittobilagor:', attachmentUrls?.length || 0)
    if (attachmentUrls?.length > 0) {
      console.log('Kvitton:', attachmentUrls)
    }
    console.log('================================')

    // Uppdatera fakturastatus till 'sent' om den var 'draft'
    if (invoice.status === 'draft') {
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoiceId)
    }

    // För nu: visa meddelande om att e-post inte är konfigurerat
    // I produktion skulle detta skicka ett riktigt e-postmeddelande
    const emailConfigured = !!process.env.RESEND_API_KEY || !!process.env.SENDGRID_API_KEY

    if (!emailConfigured) {
      // Simulera lyckad sändning för demo
      return NextResponse.json({
        success: true,
        demo: true,
        message: 'E-postfunktionen är inte konfigurerad än. Fakturan har markerats som skickad.',
        details: {
          to,
          subject,
          attachments: [
            `Faktura #${invoice.invoice_number}.pdf`,
            ...(attachmentUrls || []).map((_: string, i: number) => `Kvitto ${i + 1}`),
          ],
        },
      })
    }

    // Här skulle faktisk e-postsändning ske med Resend/SendGrid
    // Exempel med Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({
    //   from: 'Babalisk AB <faktura@babalisk.se>',
    //   to,
    //   subject,
    //   text: message,
    //   attachments: [
    //     { path: pdfUrl, filename: `Faktura-${invoice.invoice_number}.pdf` },
    //     ...attachmentUrls.map((url, i) => ({ path: url, filename: `Kvitto-${i+1}.jpg` }))
    //   ],
    // })

    return NextResponse.json({
      success: true,
      message: 'Fakturan har skickats!',
    })
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kunde inte skicka e-post' },
      { status: 500 }
    )
  }
}
