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
        <Badge className="bg-red-100 text-red-700 border-red-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {Math.abs(daysUntil)} dagar sen
        </Badge>
      )
    }
    if (daysUntil === 0) {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
          <Clock className="w-3 h-3 mr-1" />
          Idag
        </Badge>
      )
    }
    if (daysUntil <= 7) {
      return (
        <Badge className="bg-amber-50 text-amber-600 border-amber-100">
          <Clock className="w-3 h-3 mr-1" />
          {daysUntil} dagar
        </Badge>
      )
    }
    return (
      <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100">
        <CheckCircle className="w-3 h-3 mr-1" />
        {daysUntil} dagar
      </Badge>
    )
  }

  const totalUnpaid = invoices.reduce((sum, inv) => sum + inv.total, 0)

  return (
    <Card className="bg-gradient-to-br from-white to-amber-50/30 border-amber-100/50">
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-amber-700">Obetalda</CardTitle>
          <span className="text-sm font-semibold text-amber-600">{totalUnpaid.toLocaleString('sv-SE')} kr</span>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
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
                  className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs ${
                    daysUntil < 0 ? 'bg-red-50' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium truncate block">{invoice.client.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-semibold">{invoice.total.toLocaleString('sv-SE')} kr</span>
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
