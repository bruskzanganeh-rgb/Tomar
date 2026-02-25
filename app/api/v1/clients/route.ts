import { NextRequest } from 'next/server'
import { validateApiKey, requireScope } from '@/lib/api-auth'
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClientSchema } from '@/lib/schemas/client'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const keyId = authHeader?.substring(7, 23) || 'anon'
  if (!rateLimit(`apiv1:${keyId}`, 60, 60_000).success) return rateLimitResponse()

  const auth = await validateApiKey(authHeader)
  if (!auth.success) return apiError(auth.error, auth.status)

  const scopeCheck = requireScope(auth.scopes, 'read:clients')
  if (!scopeCheck.success) return apiError(scopeCheck.error, scopeCheck.status)

  try {
    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createAdminClient()
    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('user_id', auth.userId)

    if (search) {
      query = query.or(`name.ilike.%${search}%,org_number.ilike.%${search}%,email.ilike.%${search}%`)
    }

    query = query.order('name').range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return apiSuccess({
      clients: data || [],
      pagination: { total: count || 0, limit, offset, has_more: (count || 0) > offset + limit },
    })
  } catch (error) {
    console.error('[API v1] GET clients error:', error)
    return apiError('Failed to fetch clients', 500)
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const keyId = authHeader?.substring(7, 23) || 'anon'
  if (!rateLimit(`apiv1:${keyId}`, 60, 60_000).success) return rateLimitResponse()

  const auth = await validateApiKey(authHeader)
  if (!auth.success) return apiError(auth.error, auth.status)

  const scopeCheck = requireScope(auth.scopes, 'write:clients')
  if (!scopeCheck.success) return apiError(scopeCheck.error, scopeCheck.status)

  try {
    const body = await request.json()
    const parsed = createClientSchema.safeParse(body)
    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const supabase = createAdminClient()

    // Look up company_id (admin client has no auth.uid(), so DB default won't work)
    const { data: membership } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', auth.userId)
      .single()

    if (!membership) return apiError('User has no company', 400)

    const { data, error } = await supabase
      .from('clients')
      .insert({ ...parsed.data, user_id: auth.userId, company_id: membership.company_id })
      .select()
      .single()

    if (error) throw error

    return apiSuccess(data, 201)
  } catch (error) {
    console.error('[API v1] POST client error:', error)
    return apiError('Failed to create client', 500)
  }
}
