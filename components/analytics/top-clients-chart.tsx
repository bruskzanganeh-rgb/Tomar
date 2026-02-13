'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const CLIENT_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']

type TopClientsChartProps = {
  data: Array<{ name: string; revenue: number }>
  formatLocale: string
  currencyLabel: string
  revenueLabel: string
}

export default function TopClientsChart({ data, formatLocale, currencyLabel, revenueLabel }: TopClientsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
      >
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10, fill: 'var(--foreground)' }}
          tickLine={false}
          axisLine={false}
          width={100}
          tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
        />
        <Tooltip
          formatter={(value: number) => [`${value.toLocaleString(formatLocale)} ${currencyLabel}`, revenueLabel]}
          contentStyle={{
            backgroundColor: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--foreground)',
          }}
        />
        <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CLIENT_COLORS[index % CLIENT_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
