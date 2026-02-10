import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin'

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  const userId = request.nextUrl.searchParams.get('user_id')
  const eventType = request.nextUrl.searchParams.get('event_type')
  const from = request.nextUrl.searchParams.get('from')
  const to = request.nextUrl.searchParams.get('to')
  const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50'), 100)
  const offset = (page - 1) * limit

  let query = supabase
    .from('activity_events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (userId) query = query.eq('user_id', userId)
  if (eventType) query = query.eq('event_type', eventType)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    events: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  })
}
