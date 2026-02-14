import { NextRequest } from 'next/server'
import { validateApiKey, requireScope } from '@/lib/api-auth'
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateExpenseSchema } from '@/lib/schemas/expense'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization')
  const keyId = authHeader?.substring(7, 23) || 'anon'
  if (!rateLimit(`apiv1:${keyId}`, 60, 60_000).success) return rateLimitResponse()

  const auth = await validateApiKey(authHeader)
  if (!auth.success) return apiError(auth.error, auth.status)

  const scopeCheck = requireScope(auth.scopes, 'read:expenses')
  if (!scopeCheck.success) return apiError(scopeCheck.error, scopeCheck.status)

  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('expenses')
      .select('*, gig:gigs(id, project_name, date)')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return apiError('Expense not found', 404)
      throw error
    }

    return apiSuccess(data)
  } catch (error) {
    console.error('[API v1] GET expense error:', error)
    return apiError('Failed to fetch expense', 500)
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization')
  const keyId = authHeader?.substring(7, 23) || 'anon'
  if (!rateLimit(`apiv1:${keyId}`, 60, 60_000).success) return rateLimitResponse()

  const auth = await validateApiKey(authHeader)
  if (!auth.success) return apiError(auth.error, auth.status)

  const scopeCheck = requireScope(auth.scopes, 'write:expenses')
  if (!scopeCheck.success) return apiError(scopeCheck.error, scopeCheck.status)

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateExpenseSchema.safeParse(body)
    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('expenses')
      .update(parsed.data)
      .eq('id', id)
      .eq('user_id', auth.userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') return apiError('Expense not found', 404)
      throw error
    }

    return apiSuccess(data)
  } catch (error) {
    console.error('[API v1] PATCH expense error:', error)
    return apiError('Failed to update expense', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization')
  const keyId = authHeader?.substring(7, 23) || 'anon'
  if (!rateLimit(`apiv1:${keyId}`, 60, 60_000).success) return rateLimitResponse()

  const auth = await validateApiKey(authHeader)
  if (!auth.success) return apiError(auth.error, auth.status)

  const scopeCheck = requireScope(auth.scopes, 'write:expenses')
  if (!scopeCheck.success) return apiError(scopeCheck.error, scopeCheck.status)

  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.userId)

    if (error) throw error

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('[API v1] DELETE expense error:', error)
    return apiError('Failed to delete expense', 500)
  }
}
