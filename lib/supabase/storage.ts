import { createClient } from './client'

export type GigAttachment = {
  id: string
  gig_id: string
  file_name: string
  file_path: string
  file_size: number | null
  file_type: string | null
  uploaded_at: string
}

export async function uploadGigAttachment(gigId: string, file: File): Promise<GigAttachment> {
  const supabase = createClient()

  // Sanitize filename and create unique path
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filePath = `${gigId}/${Date.now()}-${sanitizedName}`

  // Upload to Storage
  const { error: uploadError } = await supabase.storage
    .from('gig-attachments')
    .upload(filePath, file)

  if (uploadError) {
    throw new Error(`Kunde inte ladda upp fil: ${uploadError.message}`)
  }

  // Save metadata to database
  const { data, error } = await supabase
    .from('gig_attachments')
    .insert({
      gig_id: gigId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type
    })
    .select()
    .single()

  if (error) {
    // Try to clean up the uploaded file
    await supabase.storage.from('gig-attachments').remove([filePath])
    throw new Error(`Kunde inte spara filinfo: ${error.message}`)
  }

  return data as GigAttachment
}

export async function deleteGigAttachment(attachmentId: string, filePath: string): Promise<void> {
  const supabase = createClient()

  // Delete from Storage
  const { error: storageError } = await supabase.storage
    .from('gig-attachments')
    .remove([filePath])

  if (storageError) {
    console.error('Storage delete error:', storageError)
  }

  // Delete from database
  const { error } = await supabase
    .from('gig_attachments')
    .delete()
    .eq('id', attachmentId)

  if (error) {
    throw new Error(`Kunde inte ta bort fil: ${error.message}`)
  }
}

export async function getGigAttachments(gigId: string): Promise<GigAttachment[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('gig_attachments')
    .select('*')
    .eq('gig_id', gigId)
    .order('uploaded_at', { ascending: false })

  if (error) {
    throw new Error(`Kunde inte hämta bilagor: ${error.message}`)
  }

  return data as GigAttachment[]
}

export async function getSignedUrl(filePath: string): Promise<string | null> {
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from('gig-attachments')
    .createSignedUrl(filePath, 3600) // 1 hour

  if (error) {
    console.error('Signed URL error:', error)
    return null
  }

  return data?.signedUrl ?? null
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return 'Okänd storlek'

  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
