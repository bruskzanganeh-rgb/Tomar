"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Mail, Receipt, FileText, ExternalLink, FileCheck } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { getSignedUrl, type GigAttachment } from '@/lib/supabase/storage'

type Expense = {
  id: string
  date: string
  supplier: string
  amount: number
  currency: string | null
  amount_sek: number | null
  category: string | null
  attachment_url: string | null
}

type InvoiceDoc = GigAttachment

type Invoice = {
  id: string
  invoice_number: number
  invoice_date: string
  due_date: string
  total: number
  gig_id: string | null
  client: { name: string; email?: string | null }
}

type SendInvoiceDialogProps = {
  invoice: Invoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function SendInvoiceDialog({
  invoice,
  open,
  onOpenChange,
  onSuccess,
}: SendInvoiceDialogProps) {
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [receipts, setReceipts] = useState<Expense[]>([])
  const [invoiceDocs, setInvoiceDocs] = useState<InvoiceDoc[]>([])
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([])
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (open && invoice) {
      loadAttachments()
      setEmail(invoice.client.email || '')
      setSubject(`Faktura #${invoice.invoice_number} - Babalisk AB`)
      setMessage(`Hej,

Bifogat finner du faktura #${invoice.invoice_number} på ${invoice.total.toLocaleString('sv-SE')} kr.

Förfallodatum: ${format(new Date(invoice.due_date), 'PPP', { locale: sv })}

Med vänliga hälsningar,
Babalisk AB`)
      setSelectedReceipts([]) // Reset selection
      setSelectedDocs([])
    }
  }, [open, invoice])

  async function loadAttachments() {
    if (!invoice?.gig_id) {
      setReceipts([])
      setInvoiceDocs([])
      return
    }

    setLoading(true)

    // Load receipts (expenses with attachments)
    const { data: receiptsData, error: receiptsError } = await supabase
      .from('expenses')
      .select('id, date, supplier, amount, currency, amount_sek, category, attachment_url')
      .eq('gig_id', invoice.gig_id)
      .not('attachment_url', 'is', null)
      .order('date', { ascending: false })

    if (receiptsError) {
      console.error('Error loading receipts:', receiptsError)
    } else {
      setReceipts(receiptsData || [])
    }

    // Load invoice documents (gig_attachments with category='invoice_doc')
    const { data: docsData, error: docsError } = await supabase
      .from('gig_attachments')
      .select('*')
      .eq('gig_id', invoice.gig_id)
      .eq('category', 'invoice_doc')
      .order('uploaded_at', { ascending: false })

    if (docsError) {
      console.error('Error loading invoice docs:', docsError)
    } else {
      setInvoiceDocs(docsData || [])
    }

    setLoading(false)
  }

  function toggleReceipt(receiptId: string) {
    setSelectedReceipts(prev =>
      prev.includes(receiptId)
        ? prev.filter(id => id !== receiptId)
        : [...prev, receiptId]
    )
  }

  function toggleDoc(docId: string) {
    setSelectedDocs(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    )
  }

  function selectAllReceipts() {
    if (selectedReceipts.length === receipts.length) {
      setSelectedReceipts([])
    } else {
      setSelectedReceipts(receipts.map(r => r.id))
    }
  }

  function selectAllDocs() {
    if (selectedDocs.length === invoiceDocs.length) {
      setSelectedDocs([])
    } else {
      setSelectedDocs(invoiceDocs.map(d => d.id))
    }
  }

  async function handleSend() {
    if (!invoice || !email) {
      toast.warning('Ange en e-postadress')
      return
    }

    setSending(true)
    try {
      // Hämta valda kvitto-URLs
      const receiptUrls = receipts
        .filter(r => selectedReceipts.includes(r.id))
        .map(r => r.attachment_url)
        .filter(Boolean) as string[]

      // Hämta signerade URLs för valda fakturaunderlag
      const docUrls: string[] = []
      for (const doc of invoiceDocs.filter(d => selectedDocs.includes(d.id))) {
        const signedUrl = await getSignedUrl(doc.file_path)
        if (signedUrl) {
          docUrls.push(signedUrl)
        }
      }

      const attachmentUrls = [...receiptUrls, ...docUrls]

      const response = await fetch('/api/invoices/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          to: email,
          subject,
          message,
          attachmentUrls,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Kunde inte skicka e-post')
      }

      toast.success('Fakturan har skickats!')
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setSending(false)
    }
  }

  const selectedTotal = receipts
    .filter(r => selectedReceipts.includes(r.id))
    .reduce((sum, r) => sum + (r.amount_sek || r.amount), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Skicka faktura #{invoice?.invoice_number}
          </DialogTitle>
          <DialogDescription>
            Skicka fakturan via e-post till kunden
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email address */}
          <div className="space-y-2">
            <Label htmlFor="email">Till</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kund@exempel.se"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Ämne</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Meddelande</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
            />
          </div>

          {/* Invoice PDF attachment (always included) */}
          <div className="p-3 rounded-lg border bg-gray-50">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Faktura #{invoice?.invoice_number}.pdf</span>
              <span className="text-xs text-muted-foreground">(bifogas automatiskt)</span>
            </div>
          </div>

          {/* Invoice documents selection */}
          {invoice?.gig_id && invoiceDocs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-muted-foreground" />
                  <Label>Bifoga fakturaunderlag</Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllDocs}
                  className="text-xs"
                >
                  {selectedDocs.length === invoiceDocs.length ? 'Avmarkera alla' : 'Välj alla'}
                </Button>
              </div>

              <div className="space-y-2 border rounded-lg p-3 bg-white">
                {invoiceDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleDoc(doc.id)}
                  >
                    <Checkbox
                      checked={selectedDocs.includes(doc.id)}
                      onCheckedChange={() => toggleDoc(doc.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm truncate block">
                        {doc.file_name}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.uploaded_at).toLocaleDateString('sv-SE')}
                      </p>
                    </div>
                  </div>
                ))}
                {selectedDocs.length > 0 && (
                  <div className="pt-2 border-t mt-2 text-sm text-muted-foreground">
                    {selectedDocs.length} dokument valda
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Receipt selection */}
          {invoice?.gig_id && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <Label>Bifoga kvitton</Label>
                </div>
                {receipts.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAllReceipts}
                    className="text-xs"
                  >
                    {selectedReceipts.length === receipts.length ? 'Avmarkera alla' : 'Välj alla'}
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : receipts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Inga kvitton kopplade till detta uppdrag
                </p>
              ) : (
                <div className="space-y-2 border rounded-lg p-3 bg-white">
                  {receipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleReceipt(receipt.id)}
                    >
                      <Checkbox
                        checked={selectedReceipts.includes(receipt.id)}
                        onCheckedChange={() => toggleReceipt(receipt.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {receipt.supplier}
                          </span>
                          {receipt.category && (
                            <span className="text-xs text-muted-foreground">
                              ({receipt.category})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(receipt.date), 'd MMM yyyy', { locale: sv })} •{' '}
                          {(receipt.amount_sek || receipt.amount).toLocaleString('sv-SE')} kr
                        </p>
                      </div>
                      {receipt.attachment_url && (
                        <a
                          href={receipt.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-gray-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                        </a>
                      )}
                    </div>
                  ))}
                  {selectedReceipts.length > 0 && (
                    <div className="pt-2 border-t mt-2 text-sm text-muted-foreground">
                      {selectedReceipts.length} kvitto{selectedReceipts.length > 1 ? 'n' : ''} valda
                      <span className="ml-1">
                        ({selectedTotal.toLocaleString('sv-SE')} kr)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Avbryt
          </Button>
          <Button onClick={handleSend} disabled={sending || !email}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Skickar...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Skicka faktura
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
