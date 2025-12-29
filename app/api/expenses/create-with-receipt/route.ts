import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { findDuplicateExpense, type DuplicateExpense } from '@/lib/expenses/duplicate-checker'

// Supabase client med service role för server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Hämta fält
    const file = formData.get('file') as File | null
    const date = formData.get('date') as string
    const supplier = formData.get('supplier') as string
    const amount = parseFloat(formData.get('amount') as string)
    const currency = formData.get('currency') as string || 'SEK'
    const amountSek = parseFloat(formData.get('amount_sek') as string) || amount
    const category = formData.get('category') as string || 'Övrigt'
    const notes = formData.get('notes') as string || null
    const gigId = formData.get('gig_id') as string || null
    const forceSave = formData.get('forceSave') === 'true'

    // Validera obligatoriska fält
    if (!date || !supplier || isNaN(amount)) {
      return NextResponse.json(
        { error: 'Datum, leverantör och belopp krävs' },
        { status: 400 }
      )
    }

    // Dublettkontroll med fuzzy matching (om inte forceSave)
    if (!forceSave) {
      // Hämta alla utgifter för samma datum
      const { data: existingExpenses } = await supabase
        .from('expenses')
        .select('id, date, supplier, amount, category')
        .eq('date', date)

      if (existingExpenses && existingExpenses.length > 0) {
        const duplicateResult = findDuplicateExpense(
          { date, supplier, amount },
          existingExpenses as DuplicateExpense[]
        )

        if (duplicateResult.isDuplicate && duplicateResult.existingExpense) {
          const existing = duplicateResult.existingExpense
          return NextResponse.json({
            isDuplicate: true,
            existingExpense: existing,
            matchType: duplicateResult.matchType,
            message: `En liknande utgift finns redan: ${existing.supplier} - ${existing.amount} kr (${existing.date})`,
          })
        }
      }
    }

    let attachmentUrl: string | null = null

    // Ladda upp fil till Supabase Storage om den finns
    if (file) {
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `receipts/${new Date(date).getFullYear()}/${fileName}`

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('expenses')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        // Fortsätt ändå - spara utgiften utan bilaga
      } else {
        // Hämta public URL
        const { data: urlData } = supabase.storage
          .from('expenses')
          .getPublicUrl(filePath)

        attachmentUrl = urlData.publicUrl
      }
    }

    // Skapa utgift i databasen
    const { data: expense, error: insertError } = await supabase
      .from('expenses')
      .insert({
        date,
        supplier,
        amount,
        currency,
        amount_sek: amountSek,
        category,
        notes,
        attachment_url: attachmentUrl,
        dropbox_synced: false,
        gig_id: gigId,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: 'Kunde inte spara utgift: ' + insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      expense,
    })
  } catch (error) {
    console.error('Create expense error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kunde inte skapa utgift' },
      { status: 500 }
    )
  }
}
