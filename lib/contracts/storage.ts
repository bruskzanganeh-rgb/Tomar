import { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'contracts'

function contractPath(companyId: string | null, contractId: string, filename: string): string {
  const prefix = companyId || 'no-company'
  return `${prefix}/${contractId}/${filename}`
}

/**
 * Upload a PDF buffer to contract storage.
 */
export async function uploadContractPdf(
  supabase: SupabaseClient,
  companyId: string | null,
  contractId: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const path = contractPath(companyId, contractId, filename)

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (error) throw new Error(`Failed to upload contract PDF: ${error.message}`)
  return path
}

/**
 * Upload a signature image (PNG) to contract storage.
 */
export async function uploadSignatureImage(
  supabase: SupabaseClient,
  companyId: string | null,
  contractId: string,
  base64Image: string
): Promise<string> {
  const path = contractPath(companyId, contractId, 'signature.png')

  // Strip data URL prefix if present
  const base64Data = base64Image.replace(/^data:image\/png;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: 'image/png',
      upsert: true,
    })

  if (error) throw new Error(`Failed to upload signature image: ${error.message}`)
  return path
}

/**
 * Get a signed URL for a contract file (1 hour expiry).
 */
export async function getContractSignedUrl(
  supabase: SupabaseClient,
  path: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600)

  if (error || !data?.signedUrl) throw new Error(`Failed to get signed URL: ${error?.message}`)
  return data.signedUrl
}

/**
 * Download a contract file as buffer.
 */
export async function downloadContractFile(
  supabase: SupabaseClient,
  path: string
): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(path)

  if (error || !data) throw new Error(`Failed to download contract file: ${error?.message}`)
  return Buffer.from(await data.arrayBuffer())
}
