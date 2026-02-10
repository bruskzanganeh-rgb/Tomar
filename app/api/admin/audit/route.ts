import { verifyAdmin } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  const userId = request.nextUrl.searchParams.get('user_id')
  const tableName = request.nextUrl.searchParams.get('table_name')
  const action = request.nextUrl.searchParams.get('action')
  const from = request.nextUrl.searchParams.get('from')
  const to = request.nextUrl.searchParams.get('to')
  const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50'), 100)
  const offset = (page - 1) * limit

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (userId) query = query.eq('user_id', userId)
  if (tableName) query = query.eq('table_name', tableName)
  if (action) query = query.eq('action', action)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    logs: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  })
}
