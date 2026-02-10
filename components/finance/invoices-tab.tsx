"use client"

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useVirtualizer } from '@tanstack/react-virtual'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, FileText, Download, Mail, Check, Trash2, ClipboardList, ChevronDown } from 'lucide-react'
import { CreateInvoiceDialog } from '@/components/invoices/create-invoice-dialog'
import { SendInvoiceDialog } from '@/components/invoices/send-invoice-dialog'
import { EditInvoiceDialog } from '@/components/invoices/edit-invoice-dialog'
import { TableSkeleton } from '@/components/skeletons/table-skeleton'
import { format } from 'date-fns'
import { useDateLocale } from '@/lib/hooks/use-date-locale'
import { useFormatLocale } from '@/lib/hooks/use-format-locale'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatCurrency, type SupportedCurrency } from '@/lib/currency/exchange'

type Invoice = {
  id: string
  invoice_number: number
  invoice_date: string
  due_date: string
  paid_date: string | null
  subtotal: number
  vat_rate: number
  vat_amount: number
  total: number
  currency: string | null
  total_base: number | null
  status: string
  gig_id: string | null
  client_id: string
  original_pdf_url: string | null
  imported_from_pdf: boolean
  client: { id: string; name: string; email: string | null }
}

type Client = {
  id: string
  name: string
}

type GigExpense = {
  id: string
  supplier: string
  amount: number
  amount_base: number
  category: string | null
  notes: string | null
}

type PendingGig = {
  id: string
  fee: number
  travel_expense: number | null
  date: string
  start_date: string | null
  end_date: string | null
  total_days: number
  project_name: string | null
  client_id: string
  client_name: string
  gig_type_id: string
  gig_type_name: string
  gig_type_name_en: string | null
  gig_type_vat_rate: number
  client_payment_terms: number
  invoice_notes: string | null
  expenses: GigExpense[]
}

const statusConfig = {
  draft: { color: 'bg-gray-100 text-gray-800' },
  sent: { color: 'bg-blue-100 text-blue-800' },
  paid: { color: 'bg-green-100 text-green-800' },
  overdue: { color: 'bg-red-100 text-red-800' },
}

export default function InvoicesTab() {
  const t = useTranslations('invoice')
  const tGig = useTranslations('gig')
  const tc = useTranslations('common')
  const tToast = useTranslations('toast')
  const dateLocale = useDateLocale()
  const formatLocale = useFormatLocale()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [pendingGigs, setPendingGigs] = useState<PendingGig[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [selectedGigForInvoice, setSelectedGigForInvoice] = useState<PendingGig | null>(null)
  const [selectedPendingGigIds, setSelectedPendingGigIds] = useState<Set<string>>(new Set())
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null)
  const supabase = createClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollHint, setShowScrollHint] = useState(true)

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
    const noScroll = el.scrollHeight <= el.clientHeight
    setShowScrollHint(!nearBottom && !noScroll)
  }

  const virtualizer = useVirtualizer({
    count: invoices.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 57,
    overscan: 5,
  })

  useEffect(() => {
    loadInvoices()
    loadClients()
    loadPendingGigs()
  }, [])

  async function loadClients() {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .order('name')
    setClients(data || [])
  }

  async function loadPendingGigs() {
    // Get gigs already linked to invoices via junction table
    const { data: linkedGigs } = await supabase
      .from('invoice_gigs')
      .select('gig_id')
    const linkedGigIds = new Set((linkedGigs || []).map((g: any) => g.gig_id))

    // Get completed gigs with fee that don't have invoices
    const { data, error } = await supabase
      .from('gigs')
      .select(`
        id,
        fee,
        travel_expense,
        date,
        start_date,
        end_date,
        total_days,
        project_name,
        invoice_notes,
        client_id,
        client:clients(name, payment_terms),
        gig_type:gig_types(id, name, name_en, vat_rate)
      `)
      .eq('status', 'completed')
      .not('fee', 'is', null)
      .not('client_id', 'is', null)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error loading pending gigs:', error)
      return
    }

    const filteredGigs = (data || []).filter((gig: any) => gig.client && !linkedGigIds.has(gig.id))
    const gigIds = filteredGigs.map(g => g.id)

    // Fetch expenses for these gigs
    let expensesData: any[] = []
    if (gigIds.length > 0) {
      const { data: expenses } = await supabase
        .from('expenses')
        .select('id, gig_id, supplier, amount, amount_base, category, notes')
        .in('gig_id', gigIds)
      expensesData = expenses || []
    }

    // Group expenses by gig_id
    const expensesByGig = expensesData.reduce((acc, expense) => {
      if (!acc[expense.gig_id]) acc[expense.gig_id] = []
      acc[expense.gig_id].push({
        id: expense.id,
        supplier: expense.supplier,
        amount: expense.amount,
        amount_base: expense.amount_base || expense.amount,
        category: expense.category,
        notes: expense.notes,
      })
      return acc
    }, {} as Record<string, GigExpense[]>)

    const pending = filteredGigs.map(gig => ({
      id: gig.id,
      fee: gig.fee!,
      travel_expense: gig.travel_expense,
      date: gig.date,
      start_date: gig.start_date,
      end_date: gig.end_date,
      total_days: gig.total_days || 1,
      project_name: gig.project_name,
      invoice_notes: (gig as any).invoice_notes || null,
      client_id: gig.client_id!,
      client_name: (gig.client as any)?.name || '',
      gig_type_id: (gig.gig_type as any)?.id || '',
      gig_type_name: (gig.gig_type as any)?.name || '',
      gig_type_name_en: (gig.gig_type as any)?.name_en || null,
      gig_type_vat_rate: (gig.gig_type as any)?.vat_rate || 25,
      client_payment_terms: (gig.client as any)?.payment_terms || 30,
      expenses: expensesByGig[gig.id] || [],
    }))

    setPendingGigs(pending)
  }

  async function updateOverdueInvoices() {
    const today = new Date().toISOString().split('T')[0]
    await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .eq('status', 'sent')
      .lt('due_date', today)
  }

  async function loadInvoices() {
    setLoading(true)
    await updateOverdueInvoices()

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(id, name, email)
      `)
      .order('invoice_number', { ascending: false })

    if (error) {
      console.error('Error loading invoices:', error)
    } else {
      setInvoices(data || [])
    }
    setLoading(false)
  }

  async function markAsPaid(id: string) {
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', id)

    if (error) {
      console.error('Error marking as paid:', error)
      toast.error(tToast('statusUpdateError'))
    } else {
      loadInvoices()
    }
  }

  function confirmDeleteInvoice(invoice: Invoice) {
    setInvoiceToDelete(invoice)
    setDeleteConfirmOpen(true)
  }

  async function deleteInvoice(invoice: Invoice) {
    // Get all linked gig IDs before deleting
    const { data: linkedGigs } = await supabase
      .from('invoice_gigs')
      .select('gig_id')
      .eq('invoice_id', invoice.id)
    const gigIds = (linkedGigs || []).map((g: any) => g.gig_id)

    // Also check legacy gig_id
    if (invoice.gig_id && !gigIds.includes(invoice.gig_id)) {
      gigIds.push(invoice.gig_id)
    }

    await supabase
      .from('invoice_lines')
      .delete()
      .eq('invoice_id', invoice.id)

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoice.id)

    if (error) {
      console.error('Error deleting invoice:', error)
      toast.error(tToast('deleteInvoiceError', { error: error.message }))
    } else {
      // Revert all linked gigs back to completed
      if (gigIds.length > 0) {
        await supabase
          .from('gigs')
          .update({ status: 'completed' })
          .in('id', gigIds)
      }
      loadInvoices()
      loadPendingGigs()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('newInvoice')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('totalInvoiced')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices
                .filter((i) => i.status !== 'draft')
                .reduce((sum, i) => sum + (i.total_base || i.total), 0)
                .toLocaleString(formatLocale)}{' '}
              {tc('kr')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('unpaid')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices
                .filter((i) => i.status === 'sent' || i.status === 'overdue')
                .reduce((sum, i) => sum + (i.total_base || i.total), 0)
                .toLocaleString(formatLocale)}{' '}
              {tc('kr')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('paidTotal')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices
                .filter((i) => i.status === 'paid')
                .reduce((sum, i) => sum + (i.total_base || i.total), 0)
                .toLocaleString(formatLocale)}{' '}
              {tc('kr')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('invoiceCount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* To invoice - Completed gigs without invoice */}
      {pendingGigs.length > 0 && (() => {
        const selectedGigs = pendingGigs.filter(g => selectedPendingGigIds.has(g.id))
        const allSameClient = selectedGigs.length > 0 &&
          selectedGigs.every(g => g.client_id === selectedGigs[0].client_id)

        return (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <ClipboardList className="h-5 w-5" />
                  {t('toInvoiceCount', { count: pendingGigs.length })}
                </CardTitle>
                {selectedPendingGigIds.size > 1 && allSameClient && (
                  <Button
                    onClick={() => {
                      setSelectedGigForInvoice(null)
                      setShowCreateDialog(true)
                    }}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    {t('collectiveInvoiceCount', { count: selectedPendingGigIds.size })}
                  </Button>
                )}
                {selectedPendingGigIds.size > 1 && !allSameClient && (
                  <p className="text-sm text-amber-700">
                    {t('sameClientRequired')}
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>{tGig('date')}</TableHead>
                    <TableHead>{tGig('client')}</TableHead>
                    <TableHead>{tGig('project')}</TableHead>
                    <TableHead>{tGig('type')}</TableHead>
                    <TableHead>{tGig('fee')}</TableHead>
                    <TableHead className="text-right">{tGig('action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingGigs.map((gig) => (
                    <TableRow key={gig.id}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedPendingGigIds.has(gig.id)}
                          onCheckedChange={(checked) => {
                            const newIds = new Set(selectedPendingGigIds)
                            if (checked) {
                              newIds.add(gig.id)
                            } else {
                              newIds.delete(gig.id)
                            }
                            setSelectedPendingGigIds(newIds)
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {gig.total_days > 1 && gig.start_date && gig.end_date
                          ? `${format(new Date(gig.start_date), 'd MMM', { locale: dateLocale })} - ${format(new Date(gig.end_date), 'd MMM yyyy', { locale: dateLocale })}`
                          : format(new Date(gig.date), 'PPP', { locale: dateLocale })}
                      </TableCell>
                      <TableCell className="font-medium">{gig.client_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {gig.project_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{gig.gig_type_name}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {gig.fee.toLocaleString(formatLocale)} {tc('kr')}
                        {gig.travel_expense && gig.travel_expense > 0 && (
                          <span className="text-muted-foreground text-sm ml-1">
                            (+{gig.travel_expense.toLocaleString(formatLocale)} {tGig('travelShort')})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedGigForInvoice(gig)
                            setSelectedPendingGigIds(new Set())
                            setShowCreateDialog(true)
                          }}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          {t('createInvoice')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      })()}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('allInvoices', { count: invoices.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton columns={7} rows={5} />
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('noInvoices')}</p>
              <p className="text-sm">{t('noInvoicesHint')}</p>
            </div>
          ) : (
            <div className="relative">
            <div ref={scrollRef} onScroll={handleScroll} className="h-[calc(100vh-13rem)] overflow-auto rounded-md border">
              <table className="w-full caption-bottom text-sm table-fixed">
                <thead className="[&_tr]:border-b sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="w-[8%]">{t('invoiceNumberShort')}</TableHead>
                    <TableHead className="w-[20%]">{t('customer')}</TableHead>
                    <TableHead className="w-[15%]">{tGig('date')}</TableHead>
                    <TableHead className="w-[15%]">{t('dueDate')}</TableHead>
                    <TableHead className="w-[12%]">{t('amount')}</TableHead>
                    <TableHead className="w-[10%]">{tGig('status')}</TableHead>
                    <TableHead className="w-[20%] text-right">{tGig('actions')}</TableHead>
                  </TableRow>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {virtualizer.getVirtualItems().length > 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        style={{ height: virtualizer.getVirtualItems()[0].start, padding: 0, border: 'none' }}
                      />
                    </tr>
                  )}
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const invoice = invoices[virtualRow.index]
                    return (
                      <TableRow
                        key={invoice.id}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedInvoice(invoice)
                          setShowEditDialog(true)
                        }}
                      >
                        <TableCell className="font-medium">
                          #{invoice.invoice_number}
                        </TableCell>
                        <TableCell>{invoice.client.name}</TableCell>
                        <TableCell>
                          {format(new Date(invoice.invoice_date), 'PPP', {
                            locale: dateLocale,
                          })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.due_date), 'PPP', { locale: dateLocale })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(invoice.total, (invoice.currency || 'SEK') as SupportedCurrency)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              statusConfig[
                                invoice.status as keyof typeof statusConfig
                              ]?.color
                            }
                          >
                            {t(`status.${invoice.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {invoice.status !== 'paid' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsPaid(invoice.id)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                {t('markPaid')}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')
                              }}
                              title={t('downloadPdf')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                setShowSendDialog(true)
                              }}
                              title={t('sendViaEmail')}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDeleteInvoice(invoice)}
                              title={t('deleteInvoice')}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {virtualizer.getVirtualItems().length > 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          height: virtualizer.getTotalSize() - (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                          padding: 0,
                          border: 'none',
                        }}
                      />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {showScrollHint && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none animate-bounce">
                <ChevronDown className="h-5 w-5 text-muted-foreground/40" />
              </div>
            )}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateInvoiceDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) {
            setSelectedGigForInvoice(null)
            setSelectedPendingGigIds(new Set())
          }
        }}
        onSuccess={() => {
          loadInvoices()
          loadPendingGigs()
          setSelectedPendingGigIds(new Set())
        }}
        initialGig={selectedGigForInvoice || undefined}
        initialGigs={
          selectedPendingGigIds.size > 1
            ? pendingGigs.filter(g => selectedPendingGigIds.has(g.id))
            : undefined
        }
      />

      <SendInvoiceDialog
        invoice={selectedInvoice}
        open={showSendDialog}
        onOpenChange={(open) => {
          setShowSendDialog(open)
          if (!open) setSelectedInvoice(null)
        }}
        onSuccess={loadInvoices}
      />

      <EditInvoiceDialog
        invoice={selectedInvoice}
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) setSelectedInvoice(null)
        }}
        onSuccess={loadInvoices}
        clients={clients}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open)
          if (!open) setInvoiceToDelete(null)
        }}
        title={t('deleteInvoice')}
        description={t('deleteInvoiceConfirm', { number: invoiceToDelete?.invoice_number ?? '' })}
        confirmLabel={tc('delete')}
        variant="destructive"
        onConfirm={() => {
          if (invoiceToDelete) {
            deleteInvoice(invoiceToDelete)
          }
          setDeleteConfirmOpen(false)
          setInvoiceToDelete(null)
        }}
      />
    </div>
  )
}
