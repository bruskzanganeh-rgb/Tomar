import { NextRequest } from 'next/server'
import { validateApiKey } from '@/lib/api-auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const keyId = authHeader?.substring(7, 23) || 'anon'
  if (!rateLimit(`apiv1:${keyId}`, 60, 60_000).success) return rateLimitResponse()

  const auth = await validateApiKey(authHeader)
  if (!auth.success) return apiError(auth.error, auth.status)

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('positions')
      .select('id, name, sort_order')
      .eq('user_id', auth.userId)
      .order('sort_order')

    if (error) throw error

    return apiSuccess(data || [])
  } catch (error) {
    console.error('[API v1] GET positions error:', error)
    return apiError('Failed to fetch positions', 500)
  }
}
