"use client"

import { useState, useEffect, useRef } from 'react'
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
import { Loader2, Trash2, ExternalLink, Upload, Image, X } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { GigCombobox } from '@/components/expenses/gig-combobox'
import { isValidReceiptFile, ALLOWED_RECEIPT_EXTENSIONS } from '@/lib/upload/file-validation'

type Expense = {
  id: string
  date: string
  supplier: string
  amount: number
  currency: string | null
  amount_sek: number | null
  category: string | null
  notes: string | null
  attachment_url: string | null
  gig_id: string | null
  gig: {
    id: string
    project_name: string | null
    date: string
    client: { name: string } | null
  } | null
}

type Gig = {
  id: string
  date: string
  project_name: string | null
  venue: string | null
  status: string
  client: { name: string } | null
}

type EditExpenseDialogProps = {
  expense: Expense | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  gigs: Gig[]
}

const categories = [
  'Resa',
  'Mat',
  'Hotell',
  'Instrument',
  'Noter',
  'Utrustning',
  'Kontorsmaterial',
  'Telefon',
  'Prenumeration',
  'Redovisning',
  'Övrigt',
]

const currencies = ['SEK', 'EUR', 'USD', 'GBP', 'DKK', 'NOK']

export function EditExpenseDialog({
  expense,
  open,
  onOpenChange,
  onSuccess,
  gigs,
}: EditExpenseDialogProps) {
  const [saving, setSaving] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Attachment state
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [attachmentLoading, setAttachmentLoading] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [hasAttachment, setHasAttachment] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    date: '',
    supplier: '',
    amount: 0,
    currency: 'SEK',
    category: 'Övrigt',
    notes: '',
    gig_id: 'none',
  })

  // Uppdatera form och ladda attachment när expense ändras
  useEffect(() => {
    if (expense && open) {
      setFormData({
        date: expense.date,
        supplier: expense.supplier,
        amount: expense.amount,
        currency: expense.currency || 'SEK',
        category: expense.category || 'Övrigt',
        notes: expense.notes || '',
        gig_id: expense.gig_id || 'none',
      })
      setHasAttachment(!!expense.attachment_url)

      // Ladda signerad URL om det finns attachment
      if (expense.attachment_url) {
        loadAttachment(expense.id)
      } else {
        setAttachmentUrl(null)
      }
    }
  }, [expense, open])

  // Rensa state när dialogen stängs
  useEffect(() => {
    if (!open) {
      setAttachmentUrl(null)
      setHasAttachment(false)
    }
  }, [open])

  async function loadAttachment(expenseId: string) {
    setAttachmentLoading(true)
    try {
      const response = await fetch(`/api/expenses/${expenseId}/attachment`)
      if (response.ok) {
        const data = await response.json()
        setAttachmentUrl(data.url)
      } else {
        // Kunde inte ladda - kanske bucket är tom eller fil saknas
        setAttachmentUrl(null)
      }
    } catch (error) {
      console.error('Error loading attachment:', error)
      setAttachmentUrl(null)
    } finally {
      setAttachmentLoading(false)
    }
  }

  async function handleUploadAttachment(file: File) {
    if (!expense) return

    setUploadingAttachment(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/expenses/${expense.id}/attachment`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Kunde inte ladda upp')
      }

      setAttachmentUrl(result.url)
      setHasAttachment(true)
      toast.success('Kvittobild uppladdad')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ett fel uppstod')
    } finally {
      setUploadingAttachment(false)
    }
  }

  async function handleDeleteAttachment() {
    if (!expense) return

    setUploadingAttachment(true)
    try {
      const response = await fetch(`/api/expenses/${expense.id}/attachment`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Kunde inte ta bort')
      }

      setAttachmentUrl(null)
      setHasAttachment(false)
      toast.success('Kvittobild borttagen')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ett fel uppstod')
    } finally {
      setUploadingAttachment(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const validation = isValidReceiptFile(file)
      if (!validation.valid) {
        toast.error(validation.error)
        e.target.value = ''
        return
      }
      handleUploadAttachment(file)
    }
    // Reset input så samma fil kan väljas igen
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!expense) return

    setSaving(true)

    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          supplier: formData.supplier,
          amount: formData.amount,
          currency: formData.currency,
          amount_sek: formData.currency === 'SEK' ? formData.amount : expense.amount_sek,
          category: formData.category,
          notes: formData.notes || null,
          gig_id: formData.gig_id === 'none' ? null : formData.gig_id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Kunde inte spara')
      }

      toast.success('Utgift uppdaterad')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ett fel uppstod')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!expense) return

    setDeleting(true)

    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Kunde inte ta bort')
      }

      toast.success('Utgift borttagen')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ett fel uppstod')
    } finally {
      setDeleting(false)
      setDeleteConfirmOpen(false)
    }
  }

  if (!expense) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[1100px]">
          <DialogHeader>
            <DialogTitle>Redigera utgift</DialogTitle>
            <DialogDescription>
              Ändra information för denna utgift
            </DialogDescription>
          </DialogHeader>

          {/* 3-kolumns layout */}
          <div className="flex gap-6">
            {/* Vänster kolumn: Kvittobild */}
            <div className="w-40 shrink-0 space-y-3">
              <Label className="text-sm font-medium">Kvittobild</Label>

              {attachmentLoading ? (
                <div className="flex flex-col items-center justify-center h-56 text-sm text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  Laddar...
                </div>
              ) : hasAttachment && attachmentUrl ? (
                <div className="space-y-2">
                  <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={attachmentUrl}
                      alt="Kvitto"
                      className="w-full h-56 object-cover rounded-lg border shadow-sm hover:opacity-90 transition-opacity"
                    />
                  </a>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAttachment}
                    >
                      {uploadingAttachment ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-3 w-3 mr-1" />
                          Byt
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-600 text-xs"
                      onClick={handleDeleteAttachment}
                      disabled={uploadingAttachment}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : hasAttachment && !attachmentUrl ? (
                <div className="space-y-2">
                  <div className="w-full h-56 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 flex items-center justify-center">
                    <p className="text-xs text-amber-600 text-center px-2">Kunde inte laddas</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAttachment}
                  >
                    {uploadingAttachment ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-3 w-3 mr-1" />
                        Ladda upp
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div
                    className="w-full h-56 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image className="h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-xs text-gray-400">Ingen bild</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAttachment}
                  >
                    {uploadingAttachment ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-3 w-3 mr-1" />
                        Ladda upp
                      </>
                    )}
                  </Button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_RECEIPT_EXTENSIONS}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Mitten kolumn: Formulärfält */}
            <div className="w-64 shrink-0 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="date">Datum</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="supplier">Leverantör</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="amount">Belopp</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="w-24 space-y-1">
                  <Label htmlFor="currency">Valuta</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="category">Kategori</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes">Anteckningar</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Valfri beskrivning"
                />
              </div>
            </div>

            {/* Höger kolumn: Uppdragsväljare */}
            <div className="flex-1 space-y-2">
              <Label>Uppdrag</Label>
              <GigCombobox
                gigs={gigs}
                value={formData.gig_id}
                onValueChange={(value) => setFormData({ ...formData, gig_id: value })}
              />
              <p className="text-xs text-muted-foreground">
                Koppla utgiften till ett uppdrag för att kunna fakturera den.
              </p>
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
              Ta bort
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Avbryt
              </Button>
              <Button onClick={handleSave} disabled={saving || !formData.supplier}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  'Spara'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Ta bort utgift"
        description="Är du säker på att du vill ta bort denna utgift? Detta går inte att ångra."
        confirmLabel={deleting ? 'Tar bort...' : 'Ta bort'}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  )
}
