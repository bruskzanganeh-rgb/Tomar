'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Building2,
  FileText,
  TrendingUp,
  Clock,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { ClientInvoiceChart } from '@/components/clients/client-invoice-chart'

type Client = {
  id: string
  name: string
  org_number: string | null
  client_code: string | null
  email: string | null
  address: string | null
  payment_terms: number
  notes: string | null
}

type Invoice = {
  id: string
  invoice_number: number
  invoice_date: string
  due_date: string
  paid_date: string | null
  total: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
}

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (clientId) {
      loadClientData()
    }
  }, [clientId])

  async function loadClientData() {
    setLoading(true)

    // Load client
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    // Load invoices for this client
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('id, invoice_number, invoice_date, due_date, paid_date, total, status')
      .eq('client_id', clientId)
      .order('invoice_date', { ascending: false })

    setClient(clientData)
    setInvoices(invoicesData || [])
    setLoading(false)
  }

  // Calculate statistics
  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid' || inv.status === 'sent')
    .reduce((sum, inv) => sum + inv.total, 0)

  const unpaidAmount = invoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.total, 0)

  const invoiceCount = invoices.length

  const lastInvoiceDate = invoices.length > 0
    ? invoices[0].invoice_date
    : null

  function getStatusBadge(status: Invoice['status']) {
    const variants: Record<Invoice['status'], { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      draft: { variant: 'secondary', label: 'Utkast' },
      sent: { variant: 'default', label: 'Skickad' },
      paid: { variant: 'outline', label: 'Betald' },
      overdue: { variant: 'destructive', label: 'Förfallen' },
    }
    const { variant, label } = variants[status]
    return <Badge variant={variant}>{label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Laddar...</div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <Link href="/clients">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka till uppdragsgivare
          </Button>
        </Link>
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Uppdragsgivare hittades inte</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/clients">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till uppdragsgivare
        </Button>
      </Link>

      {/* Client header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Building2 className="h-8 w-8" />
          {client.name}
        </h1>
        <div className="flex items-center gap-4 mt-2 text-muted-foreground">
          {client.org_number && (
            <span>Org.nr: {client.org_number}</span>
          )}
          <span>Betalningsvillkor: {client.payment_terms} dagar</span>
          {client.address && (
            <span className="text-sm">{client.address}</span>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total omsättning</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalRevenue.toLocaleString('sv-SE')} kr
            </div>
            <p className="text-xs text-muted-foreground">
              Alla betalda & skickade fakturor
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Obetalda fakturor</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {unpaidAmount.toLocaleString('sv-SE')} kr
            </div>
            <p className="text-xs text-muted-foreground">
              Väntar på betalning
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Antal fakturor</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoiceCount}</div>
            <p className="text-xs text-muted-foreground">
              Totalt antal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Senaste faktura</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastInvoiceDate
                ? format(new Date(lastInvoiceDate), 'MMM yyyy', { locale: sv })
                : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastInvoiceDate
                ? format(new Date(lastInvoiceDate), 'PPP', { locale: sv })
                : 'Inga fakturor'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice chart */}
      {invoices.length > 0 && (
        <ClientInvoiceChart invoices={invoices} clientName={client.name} />
      )}

      {/* Invoice table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Fakturor ({invoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Inga fakturor för denna uppdragsgivare</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fakturanr</TableHead>
                  <TableHead>Fakturadatum</TableHead>
                  <TableHead>Förfallodatum</TableHead>
                  <TableHead>Belopp</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      #{invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.invoice_date), 'PPP', { locale: sv })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.due_date), 'PPP', { locale: sv })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {invoice.total.toLocaleString('sv-SE')} kr
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
