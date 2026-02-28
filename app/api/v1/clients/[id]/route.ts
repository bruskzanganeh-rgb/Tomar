import { NextRequest } from 'next/server'
import { validateApiKey, requireScope } from '@/lib/api-auth'
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/types/supabase'
import { createClientSchema } from '@/lib/schemas/client'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization')
  const keyId = authHeader?.substring(7, 23) || 'anon'
  if (!rateLimit(`apiv1:${keyId}`, 60, 60_000).success) return rateLimitResponse()

  const auth = await validateApiKey(authHeader)
  if (!auth.success) return apiError(auth.error, auth.status)

  const scopeCheck = requireScope(auth.scopes, 'read:clients')
  if (!scopeCheck.success) return apiError(scopeCheck.error, scopeCheck.status)

  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase.from('clients').select('*').eq('id', id).eq('user_id', auth.userId).single()

    if (error) {
      if (error.code === 'PGRST116') return apiError('Client not found', 404)
      throw error
    }

    return apiSuccess(data)
  } catch (error) {
    console.error('[API v1] GET client error:', error)
    return apiError('Failed to fetch client', 500)
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization')
  const keyId = authHeader?.substring(7, 23) || 'anon'
  if (!rateLimit(`apiv1:${keyId}`, 60, 60_000).success) return rateLimitResponse()

  const auth = await validateApiKey(authHeader)
  if (!auth.success) return apiError(auth.error, auth.status)

  const scopeCheck = requireScope(auth.scopes, 'write:clients')
  if (!scopeCheck.success) return apiError(scopeCheck.error, scopeCheck.status)

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = createClientSchema.partial().safeParse(body)
    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const supabase = createAdminClient()
    const { payment_terms, ...rest } = parsed.data
    const updateData: Record<string, unknown> = {
      ...rest,
      ...(payment_terms !== undefined ? { payment_terms: parseInt(payment_terms, 10) || null } : {}),
    }
    const { data, error } = await supabase
      .from('clients')
      .update(updateData as Database['public']['Tables']['clients']['Update'])
      .eq('id', id)
      .eq('user_id', auth.userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') return apiError('Client not found', 404)
      throw error
    }

    return apiSuccess(data)
  } catch (error) {
    console.error('[API v1] PATCH client error:', error)
    return apiError('Failed to update client', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization')
  const keyId = authHeader?.substring(7, 23) || 'anon'
  if (!rateLimit(`apiv1:${keyId}`, 60, 60_000).success) return rateLimitResponse()

  const auth = await validateApiKey(authHeader)
  if (!auth.success) return apiError(auth.error, auth.status)

  const scopeCheck = requireScope(auth.scopes, 'write:clients')
  if (!scopeCheck.success) return apiError(scopeCheck.error, scopeCheck.status)

  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { error } = await supabase.from('clients').delete().eq('id', id).eq('user_id', auth.userId)

    if (error) throw error

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('[API v1] DELETE client error:', error)
    return apiError('Failed to delete client', 500)
  }
}
