"use client"

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { convert, type SupportedCurrency } from '@/lib/currency/exchange'
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
import { Loader2, Upload, Image, X, Sparkles, AlertCircle, PenLine, AlertTriangle, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useSubscription } from '@/lib/hooks/use-subscription'
import { GigCombobox } from '@/components/expenses/gig-combobox'
import { isValidReceiptFile, ALLOWED_RECEIPT_EXTENSIONS, ALLOWED_RECEIPT_TYPES } from '@/lib/upload/file-validation'

type UploadReceiptDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  gigId?: string
  gigTitle?: string
}

type Gig = {
  id: string
  date: string
  project_name: string | null
  venue: string | null
  status: string
  client: { name: string } | null
}

type ParsedData = {
  date: string | null
  supplier: string
  amount: number
  currency: string
  category: string
  notes?: string
  confidence: number
}

type DuplicateInfo = {
  id: string
  date: string
  supplier: string
  amount: number
  category: string | null
  matchType?: 'exact' | 'contains' | 'fuzzy'
  inputSupplier?: string
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
  'Övrigt',
]

const currencies = ['SEK', 'EUR', 'USD', 'GBP', 'DKK', 'NOK']

export function UploadReceiptDialog({
  open,
  onOpenChange,
  onSuccess,
  gigId,
  gigTitle,
}: UploadReceiptDialogProps) {
  const t = useTranslations('expense')
  const tc = useTranslations('common')
  const tt = useTranslations('toast')
  const { canScanReceipt, limits } = useSubscription()
  const [step, setStep] = useState<'upload' | 'review' | 'saving'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gigs, setGigs] = useState<Gig[]>([])
  const [selectedGigId, setSelectedGigId] = useState<string>(gigId || 'none')
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateInfo | null>(null)
  const supabase = createClient()

  const [formData, setFormData] = useState<ParsedData>({
    date: new Date().toISOString().split('T')[0],
    supplier: '',
    amount: 0,
    currency: 'SEK',
    category: 'Övrigt',
    notes: '',
    confidence: 0,
  })

  // Ladda uppdrag om dialogen öppnas utan gigId
  useEffect(() => {
    if (open && !gigId) {
      loadGigs()
    }
  }, [open, gigId])

  async function loadGigs() {
    const { data } = await supabase
      .from('gigs')
      .select('id, date, project_name, venue, status, client:clients(name)')
      .in('status', ['pending', 'accepted', 'completed', 'invoiced', 'paid'])
      .order('date', { ascending: false })

    setGigs((data || []) as unknown as Gig[])
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const validation = isValidReceiptFile(selectedFile)
      if (!validation.valid) {
        toast.error(validation.error)
        e.target.value = ''
        return
      }

      setFile(selectedFile)
      setError(null)

      // Skapa förhandsgranskning (endast för bilder)
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreview(reader.result as string)
        }
        reader.readAsDataURL(selectedFile)
      } else {
        // PDF - visa filnamn istället
        setPreview(null)
      }
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const validation = isValidReceiptFile(droppedFile)
      if (!validation.valid) {
        toast.error(validation.error)
        return
      }

      setFile(droppedFile)
      setError(null)

      // Skapa förhandsgranskning (endast för bilder)
      if (droppedFile.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreview(reader.result as string)
        }
        reader.readAsDataURL(droppedFile)
      } else {
        // PDF - visa filnamn istället
        setPreview(null)
      }
    }
  }, [])

  // Hoppa över AI och gå direkt till manuell inmatning
  const handleSkipAI = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      supplier: '',
      amount: 0,
      currency: 'SEK',
      category: 'Resa',
      notes: '',
      confidence: 0,
    })
    setStep('review')
  }

  const handleScan = async () => {
    if (!file) return
    if (!canScanReceipt) {
      toast.error(t('scanLimitReached', { limit: limits.receiptScans }))
      handleSkipAI()
      return
    }

    setScanning(true)
    setError(null)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('file', file)

      const response = await fetch('/api/expenses/scan', {
        method: 'POST',
        body: formDataToSend,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || t('couldNotScanReceipt'))
      }

      setFormData({
        date: result.data.date || new Date().toISOString().split('T')[0],
        supplier: result.data.supplier,
        amount: result.data.amount,
        currency: result.data.currency || 'SEK',
        category: result.data.category || 'Övrigt',
        notes: result.data.notes || '',
        confidence: result.data.confidence,
      })

      // Track usage
      fetch('/api/usage/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'receipt_scan' }),
      }).catch(() => {})

      setStep('review')
    } catch (err) {
      // Vid AI-fel, erbjud manuell inmatning istället
      setError(t('aiCouldNotReadReceipt'))
      handleSkipAI()
    } finally {
      setScanning(false)
    }
  }

  const handleSave = async (forceSave = false) => {
    if (!file) return

    setSaving(true)
    setError(null)
    if (!forceSave) setDuplicateWarning(null)

    try {
      // Convert to SEK if needed
      let amountBase = formData.amount
      if (formData.currency !== 'SEK' && formData.date) {
        try {
          const { converted } = await convert(formData.amount, formData.currency as SupportedCurrency, 'SEK', formData.date)
          amountBase = converted
        } catch {
          // Fallback: use original amount if conversion fails
        }
      }

      const formDataToSend = new FormData()
      formDataToSend.append('file', file)
      formDataToSend.append('date', formData.date || '')
      formDataToSend.append('supplier', formData.supplier)
      formDataToSend.append('amount', formData.amount.toString())
      formDataToSend.append('currency', formData.currency)
      formDataToSend.append('amount_base', amountBase.toString())
      formDataToSend.append('category', formData.category)
      formDataToSend.append('notes', formData.notes || '')
      if (selectedGigId && selectedGigId !== 'none') {
        formDataToSend.append('gig_id', selectedGigId)
      }
      if (forceSave) {
        formDataToSend.append('forceSave', 'true')
      }

      const response = await fetch('/api/expenses/create-with-receipt', {
        method: 'POST',
        body: formDataToSend,
      })

      const result = await response.json()

      // Dublettkontroll - visa varning istället för att spara
      if (result.isDuplicate && !forceSave) {
        setDuplicateWarning({
          ...result.existingExpense,
          matchType: result.matchType,
          inputSupplier: formData.supplier,
        })
        setSaving(false)
        return
      }

      if (!response.ok) {
        throw new Error(result.error || tt('couldNotSaveExpense'))
      }

      // Reset och stäng
      resetDialog()
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : tt('genericError'))
    } finally {
      setSaving(false)
    }
  }

  const resetDialog = () => {
    setStep('upload')
    setFile(null)
    setPreview(null)
    setError(null)
    setDuplicateWarning(null)
    setSelectedGigId(gigId || 'none')
    setFormData({
      date: new Date().toISOString().split('T')[0],
      supplier: '',
      amount: 0,
      currency: 'SEK',
      category: 'Övrigt',
      notes: '',
      confidence: 0,
    })
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetDialog()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' ? t('uploadReceipt') : t('reviewAndSave')}
            {gigTitle && <span className="text-muted-foreground font-normal text-base ml-2">– {gigTitle}</span>}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload'
              ? t('uploadReceiptDescription')
              : t('reviewDescription')}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {duplicateWarning && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  {duplicateWarning.matchType === 'exact'
                    ? t('duplicateFound')
                    : t('possibleDuplicateFound')}
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  {t('similarExpenseExists')}: <strong>{duplicateWarning.supplier}</strong> - {duplicateWarning.amount.toLocaleString('sv-SE')} {tc('kr')} ({duplicateWarning.date})
                  {duplicateWarning.category && ` [${duplicateWarning.category}]`}
                </p>
                {duplicateWarning.matchType && duplicateWarning.matchType !== 'exact' &&
                 duplicateWarning.inputSupplier &&
                 duplicateWarning.inputSupplier.toLowerCase() !== duplicateWarning.supplier.toLowerCase() && (
                  <p className="text-xs text-amber-600 mt-1">
                    {t('youEntered')}: &quot;{duplicateWarning.inputSupplier}&quot; → {t('matchedWith')}: &quot;{duplicateWarning.supplier}&quot;
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDuplicateWarning(null)}
                  >
                    {tc('cancel')}
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleSave(true)}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    {t('saveAnyway')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-4">
            {/* Drag & drop area */}
            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${preview ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'}
              `}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('receipt-file')?.click()}
            >
              {file ? (
                <div className="space-y-4">
                  {preview ? (
                    <img
                      src={preview}
                      alt={t('receipt')}
                      className="max-h-48 mx-auto rounded-lg shadow-sm"
                    />
                  ) : (
                    <div className="flex flex-col items-center">
                      <FileText className="h-16 w-16 text-red-500" />
                      <p className="text-sm text-gray-500 mt-2">{t('pdfFile')}</p>
                    </div>
                  )}
                  <p className="text-sm text-green-600 font-medium">{file?.name}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                      setPreview(null)
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    {tc('remove')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Image className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">
                    {t('dragAndDropOrClick')}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t('fileFormats')}
                  </p>
                </div>
              )}
            </div>

            <input
              id="receipt-file"
              type="file"
              accept={ALLOWED_RECEIPT_EXTENSIONS}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            {/* Mini-preview */}
            {file && (
              <div className="flex items-start gap-4">
                {preview ? (
                  <img
                    src={preview}
                    alt={t('receipt')}
                    className="w-20 h-20 object-cover rounded-lg border"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg border flex items-center justify-center bg-gray-50">
                    <FileText className="h-8 w-8 text-red-500" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm text-gray-600">{file?.name}</p>
                  {formData.confidence > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {t('aiConfidence')}: {Math.round(formData.confidence * 100)}%
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Form fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">{t('date')}</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">{t('supplier')}</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="T.ex. SJ, ICA, Spotify"
                />
              </div>

              <div className="col-span-1 sm:col-span-2 grid grid-cols-[1fr_auto] gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">{t('amount')}</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">{t('currency')}</Label>
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

              <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label htmlFor="category">{t('category')}</Label>
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

              <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label htmlFor="notes">{t('notes')}</Label>
                <Input
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('optionalDescription')}
                />
              </div>

              {/* Visa uppdragsval om inte redan kopplat via prop */}
              {!gigId && (
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <Label>{t('linkToGig')}</Label>
                  <GigCombobox
                    gigs={gigs}
                    value={selectedGigId}
                    onValueChange={setSelectedGigId}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('optionalLinkReceiptToGig')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <div className="flex gap-2 w-full justify-between">
              <Button variant="outline" onClick={() => handleClose(false)}>
                {tc('cancel')}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSkipAI} disabled={!file || scanning}>
                  <PenLine className="mr-2 h-4 w-4" />
                  {t('manualEntry')}
                </Button>
                <Button onClick={handleScan} disabled={!file || scanning}>
                  {scanning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('scanningReceipt')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {t('scanWithAI')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                {tc('back')}
              </Button>
              <Button onClick={() => handleSave()} disabled={saving || !formData.supplier}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('saveExpense')}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
