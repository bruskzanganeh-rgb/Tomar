import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'
import jsPDF from 'jspdf'

// Supabase client med service role för server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Expense = {
  id: string
  date: string
  supplier: string
  amount: number
  currency: string
  amount_sek: number
  category: string | null
  notes: string | null
  attachment_url: string | null
  gig: { project_name: string | null; venue: string | null } | null
}

// Sanitera filnamn
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50)
}

// Skapa filnamn för kvitto
function createReceiptFilename(expense: Expense, ext: string): string {
  const date = expense.date.replace(/-/g, '-')
  const supplier = sanitizeFilename(expense.supplier)
  const amount = Math.round(expense.amount_sek || expense.amount)
  return `${date}_${supplier}_${amount}kr.${ext}`
}

// Skapa CSV-innehåll
function createCsvContent(expenses: Expense[]): string {
  const headers = ['Datum', 'Leverantör', 'Belopp', 'Valuta', 'Belopp SEK', 'Kategori', 'Anteckningar', 'Uppdrag']
  const rows = expenses.map(e => [
    e.date,
    `"${e.supplier.replace(/"/g, '""')}"`,
    e.amount.toString(),
    e.currency,
    (e.amount_sek || e.amount).toString(),
    e.category || '',
    `"${(e.notes || '').replace(/"/g, '""')}"`,
    e.gig?.project_name || e.gig?.venue || '',
  ])

  return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())
    const format = searchParams.get('format') || 'zip'

    // Beräkna start- och slutdatum för månaden
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    // Hämta utgifter för månaden
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select(`
        id,
        date,
        supplier,
        amount,
        currency,
        amount_sek,
        category,
        notes,
        attachment_url,
        gig:gigs(project_name, venue)
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching expenses:', error)
      return NextResponse.json(
        { error: 'Kunde inte hämta utgifter: ' + error.message },
        { status: 500 }
      )
    }

    const typedExpenses = (expenses || []) as unknown as Expense[]

    if (typedExpenses.length === 0) {
      return NextResponse.json(
        { error: 'Inga utgifter hittades för vald månad' },
        { status: 404 }
      )
    }

    // Filtrera ut utgifter med bilagor
    const expensesWithAttachments = typedExpenses.filter(e => e.attachment_url)

    const monthName = new Date(year, month - 1).toLocaleDateString('sv-SE', { month: 'long' })
    const fileBaseName = `${year}-${month.toString().padStart(2, '0')}-Kvitton`

    // Format: individual - returnera bara URLer
    if (format === 'individual') {
      return NextResponse.json({
        success: true,
        month: `${monthName} ${year}`,
        totalExpenses: typedExpenses.length,
        totalWithReceipts: expensesWithAttachments.length,
        totalAmount: typedExpenses.reduce((sum, e) => sum + (e.amount_sek || e.amount), 0),
        expenses: typedExpenses.map(e => ({
          id: e.id,
          date: e.date,
          supplier: e.supplier,
          amount: e.amount,
          currency: e.currency,
          amount_sek: e.amount_sek,
          category: e.category,
          attachment_url: e.attachment_url,
          filename: e.attachment_url
            ? createReceiptFilename(e, e.attachment_url.split('.').pop() || 'jpg')
            : null,
        })),
      })
    }

    // Format: zip - skapa ZIP-fil med kvitton + CSV
    if (format === 'zip') {
      const zip = new JSZip()

      // Lägg till CSV-summering
      const csvContent = createCsvContent(typedExpenses)
      zip.file(`${fileBaseName}.csv`, csvContent)

      // Ladda ner och lägg till kvittobilder
      for (const expense of expensesWithAttachments) {
        if (!expense.attachment_url) continue

        try {
          const response = await fetch(expense.attachment_url)
          if (response.ok) {
            const blob = await response.arrayBuffer()
            const ext = expense.attachment_url.split('.').pop() || 'jpg'
            const filename = createReceiptFilename(expense, ext)
            zip.file(filename, blob)
          }
        } catch (fetchError) {
          console.error(`Failed to fetch receipt: ${expense.attachment_url}`, fetchError)
        }
      }

      // Generera ZIP
      const zipBuffer = await zip.generateAsync({ type: 'blob' })

      return new NextResponse(zipBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${fileBaseName}.zip"`,
        },
      })
    }

    // Format: pdf - skapa PDF med summering + kvittobilder
    if (format === 'pdf') {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      // Sida 1: Summering
      pdf.setFontSize(20)
      pdf.text(`Kvitton - ${monthName} ${year}`, 20, 25)

      pdf.setFontSize(10)
      pdf.text(`Genererad: ${new Date().toLocaleDateString('sv-SE')}`, 20, 35)

      // Summering
      const totalAmount = typedExpenses.reduce((sum, e) => sum + (e.amount_sek || e.amount), 0)
      pdf.setFontSize(12)
      pdf.text(`Antal utgifter: ${typedExpenses.length}`, 20, 50)
      pdf.text(`Antal med kvitto: ${expensesWithAttachments.length}`, 20, 58)
      pdf.text(`Total summa: ${totalAmount.toLocaleString('sv-SE')} kr`, 20, 66)

      // Tabell med utgifter
      let y = 85
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Datum', 20, y)
      pdf.text('Leverantör', 50, y)
      pdf.text('Kategori', 110, y)
      pdf.text('Belopp', 150, y)
      pdf.text('Kvitto', 180, y)

      pdf.setFont('helvetica', 'normal')
      y += 8

      for (const expense of typedExpenses) {
        if (y > 270) {
          pdf.addPage()
          y = 20
        }

        pdf.text(expense.date, 20, y)
        pdf.text(expense.supplier.substring(0, 30), 50, y)
        pdf.text((expense.category || '').substring(0, 20), 110, y)
        pdf.text(`${Math.round(expense.amount_sek || expense.amount)} kr`, 150, y)
        pdf.text(expense.attachment_url ? 'Ja' : 'Nej', 180, y)
        y += 6
      }

      // Lägg till kvittobilder på separata sidor
      for (const expense of expensesWithAttachments) {
        if (!expense.attachment_url) continue

        try {
          const response = await fetch(expense.attachment_url)
          if (response.ok) {
            const blob = await response.arrayBuffer()
            const base64 = Buffer.from(blob).toString('base64')

            // Bestäm bildformat
            const ext = expense.attachment_url.split('.').pop()?.toLowerCase() || 'jpeg'
            const imageFormat = ext === 'png' ? 'PNG' : 'JPEG'

            pdf.addPage()

            // Header på varje kvittosida
            pdf.setFontSize(10)
            pdf.text(`${expense.date} - ${expense.supplier}`, 20, 15)
            pdf.text(`${Math.round(expense.amount_sek || expense.amount)} ${expense.currency}`, 20, 22)
            if (expense.category) {
              pdf.text(`Kategori: ${expense.category}`, 20, 29)
            }

            // Lägg till bild (max storlek för A4)
            try {
              pdf.addImage(
                `data:image/${imageFormat.toLowerCase()};base64,${base64}`,
                imageFormat,
                20,
                40,
                170, // bredd
                0 // höjd = auto baserat på aspect ratio
              )
            } catch (imgError) {
              pdf.setFontSize(12)
              pdf.text('Kunde inte ladda kvittobild', 20, 50)
            }
          }
        } catch (fetchError) {
          console.error(`Failed to fetch receipt for PDF: ${expense.attachment_url}`, fetchError)
        }
      }

      const pdfArrayBuffer = pdf.output('arraybuffer')

      return new NextResponse(pdfArrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileBaseName}.pdf"`,
        },
      })
    }

    return NextResponse.json(
      { error: 'Ogiltigt format. Använd: zip, pdf, eller individual' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export misslyckades' },
      { status: 500 }
    )
  }
}
