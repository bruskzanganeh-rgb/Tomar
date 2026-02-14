import { NextRequest } from 'next/server'
import { validateApiKey, requireScope } from '@/lib/api-auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { MAX_FILE_SIZE } from '@/lib/upload/file-validation'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization')
  const keyId = authHeader?.substring(7, 23) || 'anon'
  if (!rateLimit(`apiv1:${keyId}`, 60, 60_000).success) return rateLimitResponse()

  const auth = await validateApiKey(authHeader)
  if (!auth.success) return apiError(auth.error, auth.status)

  const scopeCheck = requireScope(auth.scopes, 'read:gigs')
  if (!scopeCheck.success) return apiError(scopeCheck.error, scopeCheck.status)

  try {
    const { id } = await params
    const supabase = createAdminClient()

    // Verify gig ownership
    const { data: gig, error: gigError } = await supabase
      .from('gigs')
      .select('id')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .single()

    if (gigError || !gig) return apiError('Gig not found', 404)

    const { data: attachments, error } = await supabase
      .from('gig_attachments')
      .select('id, file_name, file_size, file_type, category, uploaded_at, file_path')
      .eq('gig_id', id)
      .eq('user_id', auth.userId)
      .order('uploaded_at', { ascending: false })

    if (error) throw error

    // Generate signed URLs for each attachment
    const withUrls = await Promise.all(
      (attachments || []).map(async (att) => {
        const { data: signedData } = await supabase.storage
          .from('gig-attachments')
          .createSignedUrl(att.file_path, 3600)

        return {
          id: att.id,
          file_name: att.file_name,
          file_size: att.file_size,
          file_type: att.file_type,
          category: att.category,
          uploaded_at: att.uploaded_at,
          url: signedData?.signedUrl || null,
        }
      })
    )

    return apiSuccess(withUrls)
  } catch (error) {
    console.error('[API v1] GET gig attachments error:', error)
    return apiError('Failed to fetch attachments', 500)
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization')
  const keyId = authHeader?.substring(7, 23) || 'anon'
  if (!rateLimit(`apiv1:${keyId}`, 60, 60_000).success) return rateLimitResponse()

  const auth = await validateApiKey(authHeader)
  if (!auth.success) return apiError(auth.error, auth.status)

  const scopeCheck = requireScope(auth.scopes, 'write:gigs')
  if (!scopeCheck.success) return apiError(scopeCheck.error, scopeCheck.status)

  try {
    const { id } = await params
    const supabase = createAdminClient()
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const category = (formData.get('category') as string) || 'gig_info'

    if (!file) return apiError('No file uploaded. Send multipart/form-data with field "file".', 400)

    if (file.type !== 'application/pdf') {
      return apiError('Only PDF files are allowed for gig attachments.', 400)
    }

    if (file.size > MAX_FILE_SIZE) return apiError('File too large. Max 10 MB.', 400)

    if (!['gig_info', 'invoice_doc'].includes(category)) {
      return apiError('Invalid category. Use "gig_info" or "invoice_doc".', 400)
    }

    // Verify gig ownership
    const { data: gig, error: gigError } = await supabase
      .from('gigs')
      .select('id')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .single()

    if (gigError || !gig) return apiError('Gig not found', 404)

    // Upload file
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${id}/${Date.now()}-${sanitizedName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('gig-attachments')
      .upload(filePath, buffer, { contentType: file.type })

    if (uploadError) return apiError('Could not upload file', 500)

    // Save metadata
    const { data: attachment, error: insertError } = await supabase
      .from('gig_attachments')
      .insert({
        gig_id: id,
        user_id: auth.userId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        category,
      })
      .select('id, file_name, file_size, file_type, category, uploaded_at')
      .single()

    if (insertError) {
      await supabase.storage.from('gig-attachments').remove([filePath])
      return apiError('Could not save attachment metadata', 500)
    }

    // Get signed URL
    const { data: signedData } = await supabase.storage
      .from('gig-attachments')
      .createSignedUrl(filePath, 3600)

    return apiSuccess({
      ...attachment,
      url: signedData?.signedUrl || null,
    }, 201)
  } catch (error) {
    console.error('[API v1] POST gig attachment error:', error)
    return apiError('Failed to upload attachment', 500)
  }
}
