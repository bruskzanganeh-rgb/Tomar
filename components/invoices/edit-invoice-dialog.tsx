"use client"

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Trash2, FileText, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { createClient } from '@/lib/supabase/client'

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
  status: string
  client_id: string
  original_pdf_url: string | null
  imported_from_pdf: boolean
  client: { id: string; name: string } | null
}

type Client = {
  id: string
  name: string
}

type EditInvoiceDialogProps = {
  invoice: Invoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  clients: Client[]
}

export function EditInvoiceDialog({
  invoice,
  open,
  onOpenChange,
  onSuccess,
  clients,
}: EditInvoiceDialogProps) {
  const t = useTranslations('invoice')
  const tc = useTranslations('common')
  const [saving, setSaving] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  // PDF state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [hasPdf, setHasPdf] = useState(false)

  const [formData, setFormData] = useState({
    invoice_number: 0,
    client_id: '',
    invoice_date: '',
    due_date: '',
    subtotal: 0,
    vat_rate: 25,
    vat_amount: 0,
    total: 0,
    status: 'draft',
    paid_date: '',
  })

  const statuses = [
    { value: 'draft', label: t('status.draft') },
    { value: 'sent', label: t('status.sent') },
    { value: 'paid', label: t('status.paid') },
    { value: 'overdue', label: t('status.overdue') },
  ]

  // Update form and load PDF when invoice changes
  useEffect(() => {
    if (invoice && open) {
      setFormData({
        invoice_number: invoice.invoice_number,
        client_id: invoice.client_id || '',
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        subtotal: invoice.subtotal,
        vat_rate: invoice.vat_rate,
        vat_amount: invoice.vat_amount,
        total: invoice.total,
        status: invoice.status,
        paid_date: invoice.paid_date || '',
      })
      setHasPdf(!!invoice.original_pdf_url)

      // Load signed URL if PDF exists
      if (invoice.original_pdf_url) {
        loadPdf(invoice.id)
      } else {
        setPdfUrl(null)
      }
    }
  }, [invoice, open])

  // Clear state when dialog closes
  useEffect(() => {
    if (!open) {
      setPdfUrl(null)
      setHasPdf(false)
    }
  }, [open])

  async function loadPdf(invoiceId: string) {
    setPdfLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/original-pdf`)
      if (response.ok) {
        const data = await response.json()
        setPdfUrl(data.url)
      } else {
        setPdfUrl(null)
      }
    } catch (error) {
      console.error('Error loading PDF:', error)
      setPdfUrl(null)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleSave = async () => {
    if (!invoice) return

    setSaving(true)

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          invoice_number: formData.invoice_number,
          client_id: formData.client_id || null,
          invoice_date: formData.invoice_date,
          due_date: formData.due_date,
          subtotal: formData.subtotal,
          vat_rate: formData.vat_rate,
          vat_amount: formData.vat_amount,
          total: formData.total,
          status: formData.status,
          paid_date: formData.paid_date || null,
        })
        .eq('id', invoice.id)

      if (error) throw error

      toast.success(t('invoiceUpdated'))
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorOccurred'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!invoice) return

    setDeleting(true)

    try {
      // Delete invoice_lines first
      await supabase
        .from('invoice_lines')
        .delete()
        .eq('invoice_id', invoice.id)

      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id)

      if (error) throw error

      toast.success(t('invoiceDeleted'))
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorOccurred'))
    } finally {
      setDeleting(false)
      setDeleteConfirmOpen(false)
    }
  }

  if (!invoice) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>{t('editInvoice', { number: invoice.invoice_number })}</DialogTitle>
            <DialogDescription>
              {invoice.imported_from_pdf ? t('importedInvoice') : t('createdInvoice')}
            </DialogDescription>
          </DialogHeader>

          {/* 2-column layout: PDF | Form */}
          <div className="flex gap-6">
            {/* Left column: PDF preview */}
            <div className="hidden md:block w-64 shrink-0 space-y-3">
              <Label className="text-sm font-medium">{t('originalPdf')}</Label>

              {pdfLoading ? (
                <div className="flex flex-col items-center justify-center h-80 text-sm text-gray-500 border rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  {tc('loading')}
                </div>
              ) : hasPdf && pdfUrl ? (
                <div className="space-y-2">
                  <div className="h-80 border rounded-lg overflow-hidden bg-gray-100">
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full"
                      title="Original PDF"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => window.open(pdfUrl, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    {t('openInNewWindow')}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-sm text-gray-400 border-2 border-dashed rounded-lg">
                  <FileText className="h-12 w-12 mb-2 opacity-50" />
                  <p>{t('noPdf')}</p>
                  {!invoice.imported_from_pdf && (
                    <p className="text-xs mt-1">{t('createdManually')}</p>
                  )}
                </div>
              )}
            </div>

            {/* Right column: Form fields */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="invoice_number">{t('invoiceNumber')}</Label>
                <Input
                  id="invoice_number"
                  type="number"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="client_id">{t('customer')}</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectClient')} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="invoice_date">{t('invoiceDate')}</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="due_date">{t('dueDate')}</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="subtotal">{t('netAmount')}</Label>
                <Input
                  id="subtotal"
                  type="number"
                  step="0.01"
                  value={formData.subtotal}
                  onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="vat_rate">{t('vatRate')}</Label>
                <Select
                  value={formData.vat_rate.toString()}
                  onValueChange={(value) => setFormData({ ...formData, vat_rate: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="6">6%</SelectItem>
                    <SelectItem value="25">25%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="vat_amount">{t('vatAmount')}</Label>
                <Input
                  id="vat_amount"
                  type="number"
                  step="0.01"
                  value={formData.vat_amount}
                  onChange={(e) => setFormData({ ...formData, vat_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="total">{t('totalAmount')}</Label>
                <Input
                  id="total"
                  type="number"
                  step="0.01"
                  value={formData.total}
                  onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.status === 'paid' && (
                <div className="space-y-1">
                  <Label htmlFor="paid_date">{t('paidDate')}</Label>
                  <Input
                    id="paid_date"
                    type="date"
                    value={formData.paid_date}
                    onChange={(e) => setFormData({ ...formData, paid_date: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              variant="ghost"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={saving || deleting}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {tc('delete')}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  tc('save')
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t('deleteInvoice')}
        description={t('deleteInvoiceConfirm', { number: invoice.invoice_number })}
        confirmLabel={deleting ? t('deleting') : tc('delete')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  )
}
