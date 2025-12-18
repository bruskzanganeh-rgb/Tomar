'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type ClientRevenue = {
  name: string
  revenue: number
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316'
]

export function TopClients() {
  const [data, setData] = useState<ClientRevenue[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadTopClients()
  }, [])

  async function loadTopClients() {
    setLoading(true)

    const { data: invoices } = await supabase
      .from('invoices')
      .select('total, client:clients(id, name)')
      .in('status', ['sent', 'paid'])

    if (invoices) {
      // Group by client
      const clientTotals: { [key: string]: { name: string; revenue: number } } = {}

      invoices.forEach((inv: any) => {
        if (inv.client) {
          const clientId = inv.client.id
          const clientName = inv.client.name
          if (!clientTotals[clientId]) {
            clientTotals[clientId] = { name: clientName, revenue: 0 }
          }
          clientTotals[clientId].revenue += inv.total
        }
      })

      // Sort and take top 10
      const sorted = Object.values(clientTotals)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      setData(sorted)
    }

    setLoading(false)
  }

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)

  return (
    <Card className="bg-gradient-to-br from-white to-indigo-50/30 border-indigo-100/50">
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-indigo-700">Topp uppdragsgivare</CardTitle>
          <span className="text-sm font-semibold text-indigo-600">{totalRevenue.toLocaleString('sv-SE')} kr</span>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {loading ? (
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
            Laddar...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={data.slice(0, 6)}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={100}
                tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString('sv-SE')} kr`, 'Omsättning']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
