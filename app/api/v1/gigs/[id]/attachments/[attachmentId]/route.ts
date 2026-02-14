import { NextRequest } from 'next/server'
import { validateApiKey, requireScope } from '@/lib/api-auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ id: string; attachmentId: string }> }

export async function DELETE(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization')
  const keyId = authHeader?.substring(7, 23) || 'anon'
  if (!rateLimit(`apiv1:${keyId}`, 60, 60_000).success) return rateLimitResponse()

  const auth = await validateApiKey(authHeader)
  if (!auth.success) return apiError(auth.error, auth.status)

  const scopeCheck = requireScope(auth.scopes, 'write:gigs')
  if (!scopeCheck.success) return apiError(scopeCheck.error, scopeCheck.status)

  try {
    const { id, attachmentId } = await params
    const supabase = createAdminClient()

    // Verify gig ownership
    const { data: gig, error: gigError } = await supabase
      .from('gigs')
      .select('id')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .single()

    if (gigError || !gig) return apiError('Gig not found', 404)

    // Get attachment with file_path
    const { data: attachment, error: attError } = await supabase
      .from('gig_attachments')
      .select('file_path')
      .eq('id', attachmentId)
      .eq('gig_id', id)
      .eq('user_id', auth.userId)
      .single()

    if (attError || !attachment) return apiError('Attachment not found', 404)

    // Delete from storage
    await supabase.storage.from('gig-attachments').remove([attachment.file_path])

    // Delete from database
    const { error: deleteError } = await supabase
      .from('gig_attachments')
      .delete()
      .eq('id', attachmentId)
      .eq('user_id', auth.userId)

    if (deleteError) return apiError('Could not delete attachment', 500)

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('[API v1] DELETE gig attachment error:', error)
    return apiError('Failed to delete attachment', 500)
  }
}
