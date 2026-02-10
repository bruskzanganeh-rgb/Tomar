import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUsageTypeLabel } from '@/lib/ai/usage-logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type UsageBreakdown = {
  [key: string]: {
    calls: number
    cost: number
    label: string
  }
}

type DailyTotal = {
  date: string
  cost: number
  calls: number
}

type RecentCall = {
  id: string
  created_at: string
  usage_type: string
  model: string
  input_tokens: number
  output_tokens: number
  estimated_cost_usd: number
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '30d'

    // Beräkna startdatum baserat på period
    const now = new Date()
    let startDate: Date

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'all':
        startDate = new Date('2020-01-01') // Långt tillbaka
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const startDateStr = startDate.toISOString()

    // Hämta alla loggar för perioden
    const { data: logs, error } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .gte('created_at', startDateStr)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch AI usage logs:', error)
      return NextResponse.json(
        { error: 'Could not fetch AI usage data' },
        { status: 500 }
      )
    }

    // Beräkna totaler och uppdelning
    let totalCalls = 0
    let totalCostUsd = 0
    const breakdown: UsageBreakdown = {}
    const dailyMap: Map<string, { cost: number; calls: number }> = new Map()

    for (const log of logs || []) {
      totalCalls++
      totalCostUsd += parseFloat(log.estimated_cost_usd) || 0

      // Uppdelning per typ
      const type = log.usage_type
      if (!breakdown[type]) {
        breakdown[type] = {
          calls: 0,
          cost: 0,
          label: getUsageTypeLabel(type),
        }
      }
      breakdown[type].calls++
      breakdown[type].cost += parseFloat(log.estimated_cost_usd) || 0

      // Daglig totalsumma
      const dateStr = new Date(log.created_at).toISOString().split('T')[0]
      const existing = dailyMap.get(dateStr) || { cost: 0, calls: 0 }
      dailyMap.set(dateStr, {
        cost: existing.cost + (parseFloat(log.estimated_cost_usd) || 0),
        calls: existing.calls + 1,
      })
    }

    // Konvertera daglig map till array och sortera
    const dailyTotals: DailyTotal[] = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Senaste 10 anrop
    const recentCalls: RecentCall[] = (logs || [])
      .slice(0, 10)
      .map((log) => ({
        id: log.id,
        created_at: log.created_at,
        usage_type: log.usage_type,
        model: log.model,
        input_tokens: log.input_tokens,
        output_tokens: log.output_tokens,
        estimated_cost_usd: parseFloat(log.estimated_cost_usd) || 0,
      }))

    return NextResponse.json({
      period,
      totalCalls,
      totalCostUsd: Math.round(totalCostUsd * 1000000) / 1000000, // 6 decimaler
      breakdown,
      dailyTotals,
      recentCalls,
    })
  } catch (error) {
    console.error('AI usage API error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
