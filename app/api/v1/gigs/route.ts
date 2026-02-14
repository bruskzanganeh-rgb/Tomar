import { NextRequest } from 'next/server'
import { validateApiKey, requireScope } from '@/lib/api-auth'
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'
import { createGigSchema } from '@/lib/schemas/gig'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const keyId = authHeader?.substring(7, 23) || 'anon'
  if (!rateLimit(`apiv1:${keyId}`, 60, 60_000).success) return rateLimitResponse()

  const auth = await validateApiKey(authHeader)
  if (!auth.success) return apiError(auth.error, auth.status)

  const scopeCheck = requireScope(auth.scopes, 'read:gigs')
  if (!scopeCheck.success) return apiError(scopeCheck.error, scopeCheck.status)

  try {
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const clientId = searchParams.get('client_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createAdminClient()
    let query = supabase
      .from('gigs')
      .select(`
        *,
        client:clients(id, name),
        gig_type:gig_types(id, name),
        position:positions(id, name),
        gig_dates(date)
      `, { count: 'exact' })
      .eq('user_id', auth.userId)

    if (status) query = query.eq('status', status)
    if (clientId) query = query.eq('client_id', clientId)
    if (dateFrom) query = query.gte('date', dateFrom)
    if (dateTo) query = query.lte('date', dateTo)

    query = query.order('date', { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return apiSuccess({
      gigs: data || [],
      pagination: { total: count || 0, limit, offset, has_more: (count || 0) > offset + limit },
    })
  } catch (error) {
    console.error('[API v1] GET gigs error:', error)
    return apiError('Failed to fetch gigs', 500)
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const keyId = authHeader?.substring(7, 23) || 'anon'
  if (!rateLimit(`apiv1:${keyId}`, 60, 60_000).success) return rateLimitResponse()

  const auth = await validateApiKey(authHeader)
  if (!auth.success) return apiError(auth.error, auth.status)

  const scopeCheck = requireScope(auth.scopes, 'write:gigs')
  if (!scopeCheck.success) return apiError(scopeCheck.error, scopeCheck.status)

  try {
    const body = await request.json()
    const parsed = createGigSchema.safeParse(body)
    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
    }

    const supabase = createAdminClient()
    const { dates, ...gigData } = parsed.data

    const { data: gig, error: gigError } = await supabase
      .from('gigs')
      .insert({
        ...gigData,
        user_id: auth.userId,
        date: dates[0],
        start_date: dates[0],
        end_date: dates[dates.length - 1],
        total_days: dates.length,
      })
      .select()
      .single()

    if (gigError) throw gigError

    // Create gig_dates
    const gigDates = dates.map((date) => ({
      gig_id: gig.id,
      date,
      user_id: auth.userId,
    }))

    await supabase.from('gig_dates').insert(gigDates)

    // Fetch full gig with relations
    const { data: fullGig } = await supabase
      .from('gigs')
      .select(`
        *,
        client:clients(id, name),
        gig_type:gig_types(id, name),
        position:positions(id, name),
        gig_dates(date)
      `)
      .eq('id', gig.id)
      .single()

    return apiSuccess(fullGig, 201)
  } catch (error) {
    console.error('[API v1] POST gig error:', error)
    return apiError('Failed to create gig', 500)
  }
}
