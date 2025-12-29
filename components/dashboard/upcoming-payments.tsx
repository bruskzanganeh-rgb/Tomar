'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { sv } from 'date-fns/locale'

type Invoice = {
  id: string
  invoice_number: number
  total: number
  due_date: string
  status: string
  client: { name: string }
}

export function UpcomingPayments() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadInvoices()
  }, [])

  async function loadInvoices() {
    setLoading(true)

    const { data } = await supabase
      .from('invoices')
      .select('id, invoice_number, total, due_date, status, client:clients(name)')
      .in('status', ['sent', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(8)

    setInvoices((data || []) as unknown as Invoice[])
    setLoading(false)
  }

  function getDaysUntilDue(dueDate: string): number {
    return differenceInDays(new Date(dueDate), new Date())
  }

  function getStatusBadge(daysUntil: number) {
    if (daysUntil < 0) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {Math.abs(daysUntil)}d sen
        </Badge>
      )
    }
    if (daysUntil === 0) {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          <Clock className="w-3 h-3 mr-1" />
          Idag
        </Badge>
      )
    }
    if (daysUntil <= 7) {
      return (
        <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/20">
          <Clock className="w-3 h-3 mr-1" />
          {daysUntil}d
        </Badge>
      )
    }
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
        <CheckCircle className="w-3 h-3 mr-1" />
        {daysUntil}d
      </Badge>
    )
  }

  const totalUnpaid = invoices.reduce((sum, inv) => sum + inv.total, 0)

  return (
    <Card variant="glass" className="border-blue-500/20">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-blue-400">Obetalda</CardTitle>
          <span className="text-sm font-semibold text-white">{totalUnpaid.toLocaleString('sv-SE')} kr</span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {loading ? (
          <div className="h-[100px] flex items-center justify-center text-muted-foreground text-sm">
            Laddar...
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <CheckCircle className="h-6 w-6 mx-auto mb-1 text-emerald-400" />
            <p className="text-xs">Allt betalt!</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {invoices.slice(0, 5).map((invoice) => {
              const daysUntil = getDaysUntilDue(invoice.due_date)
              return (
                <div
                  key={invoice.id}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs transition-colors ${
                    daysUntil < 0 ? 'bg-red-500/10' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium truncate block text-white">{invoice.client.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-semibold text-white">{invoice.total.toLocaleString('sv-SE')} kr</span>
                    {getStatusBadge(daysUntil)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
