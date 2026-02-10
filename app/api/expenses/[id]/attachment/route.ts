import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Extrahera filsökväg från public URL
function extractFilePath(attachmentUrl: string): string | null {
  try {
    // URL format: https://{project}.supabase.co/storage/v1/object/public/expenses/receipts/2025/file.jpg
    const url = new URL(attachmentUrl)
    const pathParts = url.pathname.split('/storage/v1/object/public/expenses/')
    if (pathParts.length > 1) {
      return pathParts[1]
    }
    return null
  } catch {
    return null
  }
}

// GET - Hämta signerad URL för kvittobild
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Hämta expense för att få attachment_url
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('attachment_url')
      .eq('id', id)
      .single()

    if (fetchError || !expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    if (!expense.attachment_url) {
      return NextResponse.json(
        { error: 'No receipt image exists' },
        { status: 404 }
      )
    }

    const filePath = extractFilePath(expense.attachment_url)
    if (!filePath) {
      return NextResponse.json(
        { error: 'Could not read file path' },
        { status: 400 }
      )
    }

    // Skapa signerad URL (giltig i 1 timme)
    const { data: signedData, error: signError } = await supabase.storage
      .from('expenses')
      .createSignedUrl(filePath, 3600)

    if (signError || !signedData) {
      console.error('Signed URL error:', signError)
      return NextResponse.json(
        { error: 'Could not create signed URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: signedData.signedUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    })
  } catch (error) {
    console.error('Attachment GET error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

// POST - Ladda upp ny kvittobild
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file attached' },
        { status: 400 }
      )
    }

    // Hämta befintlig expense
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('attachment_url, date')
      .eq('id', id)
      .single()

    if (fetchError || !expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    // Ta bort gammal fil om den finns
    if (expense.attachment_url) {
      const oldPath = extractFilePath(expense.attachment_url)
      if (oldPath) {
        await supabase.storage.from('expenses').remove([oldPath])
      }
    }

    // Ladda upp ny fil
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const year = new Date(expense.date).getFullYear()
    const filePath = `receipts/${year}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('expenses')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Could not upload file: ' + uploadError.message },
        { status: 500 }
      )
    }

    // Hämta public URL (för att spara i DB - extraheras senare för signering)
    const { data: urlData } = supabase.storage
      .from('expenses')
      .getPublicUrl(filePath)

    // Uppdatera expense med ny attachment_url
    const { error: updateError } = await supabase
      .from('expenses')
      .update({ attachment_url: urlData.publicUrl })
      .eq('id', id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Could not update expense' },
        { status: 500 }
      )
    }

    // Returnera signerad URL för visning
    const { data: signedData } = await supabase.storage
      .from('expenses')
      .createSignedUrl(filePath, 3600)

    return NextResponse.json({
      success: true,
      url: signedData?.signedUrl || urlData.publicUrl,
    })
  } catch (error) {
    console.error('Attachment POST error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

// DELETE - Ta bort kvittobild
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Hämta expense för att få attachment_url
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('attachment_url')
      .eq('id', id)
      .single()

    if (fetchError || !expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    if (!expense.attachment_url) {
      return NextResponse.json(
        { error: 'No receipt image to delete' },
        { status: 404 }
      )
    }

    // Ta bort fil från storage
    const filePath = extractFilePath(expense.attachment_url)
    if (filePath) {
      const { error: removeError } = await supabase.storage
        .from('expenses')
        .remove([filePath])

      if (removeError) {
        console.error('Remove error:', removeError)
        // Fortsätt ändå - uppdatera DB
      }
    }

    // Uppdatera expense - ta bort attachment_url
    const { error: updateError } = await supabase
      .from('expenses')
      .update({ attachment_url: null })
      .eq('id', id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Could not update expense' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Attachment DELETE error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
