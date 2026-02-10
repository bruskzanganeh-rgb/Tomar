import { verifyAdmin } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  const userId = request.nextUrl.searchParams.get('user_id')
  const activeOnly = request.nextUrl.searchParams.get('active_only') === 'true'
  const from = request.nextUrl.searchParams.get('from')
  const to = request.nextUrl.searchParams.get('to')
  const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50'), 100)
  const offset = (page - 1) * limit

  let query = supabase
    .from('user_sessions')
    .select('*', { count: 'exact' })
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (userId) query = query.eq('user_id', userId)
  if (activeOnly) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    query = query.is('ended_at', null).gte('last_active_at', fiveMinAgo)
  }
  if (from) query = query.gte('started_at', from)
  if (to) query = query.lte('started_at', to)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enrich with company info
  const userIds = [...new Set((data || []).map(s => s.user_id))]
  const { data: settings } = await supabase
    .from('company_settings')
    .select('user_id, company_name, email')
    .in('user_id', userIds)

  const settingsMap = new Map((settings || []).map(s => [s.user_id, s]))

  const sessions = (data || []).map(s => ({
    ...s,
    company_name: settingsMap.get(s.user_id)?.company_name || null,
    email: settingsMap.get(s.user_id)?.email || null,
  }))

  return NextResponse.json({
    sessions,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  })
}
