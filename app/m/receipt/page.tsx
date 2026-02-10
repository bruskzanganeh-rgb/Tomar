'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Camera, Loader2, Check, Upload } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function MobileReceipt() {
  const t = useTranslations('mobile')
  const tExpense = useTranslations('expense')
  const tc = useTranslations('common')

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<{
    supplier: string
    amount: number
    date: string
    currency: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    scanReceipt(f)
  }

  async function scanReceipt(f: File) {
    setScanning(true)
    const formData = new FormData()
    formData.append('file', f)

    try {
      const res = await fetch('/api/expenses/scan', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Scan failed')
      const data = await res.json()
      setResult({
        supplier: data.supplier || t('unknown'),
        amount: data.amount || 0,
        date: data.date || new Date().toISOString().split('T')[0],
        currency: data.currency || 'SEK',
      })
    } catch {
      toast.error(t('couldNotReadReceipt'))
    }
    setScanning(false)
  }

  async function saveExpense() {
    if (!file || !result) return
    setSaving(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('supplier', result.supplier)
    formData.append('amount', String(result.amount))
    formData.append('date', result.date)
    formData.append('currency', result.currency)

    try {
      const res = await fetch('/api/expenses/create-with-receipt', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success(t('receiptSaved'))
      router.push('/m')
    } catch {
      toast.error(t('couldNotSave'))
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/m">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">{tExpense('receipt')}</h1>
      </div>

      {!preview ? (
        // Camera / file picker
        <div className="flex flex-col items-center gap-4 py-12">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-40 h-40 rounded-3xl bg-emerald-50 border-2 border-dashed border-emerald-300 active:bg-emerald-100 transition-colors"
          >
            <Camera className="h-12 w-12 text-emerald-600 mb-2" />
            <span className="text-sm font-medium text-emerald-700">{t('photoReceipt')}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <p className="text-sm text-muted-foreground">{t('orChooseFromGallery')}</p>
          <Button
            variant="outline"
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'image/*,application/pdf'
              input.onchange = (e) => {
                const f = (e.target as HTMLInputElement).files?.[0]
                if (f) {
                  setFile(f)
                  setPreview(URL.createObjectURL(f))
                  scanReceipt(f)
                }
              }
              input.click()
            }}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t('chooseFile')}
          </Button>
        </div>
      ) : (
        // Preview + results
        <div className="space-y-4">
          {/* Preview */}
          <div className="rounded-xl overflow-hidden border bg-gray-50 max-h-60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={tExpense('receipt')} className="w-full object-contain max-h-60" />
          </div>

          {scanning ? (
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm font-medium">{t('readingReceipt')}</span>
            </div>
          ) : result ? (
            <div className="space-y-3">
              <div className="bg-card rounded-xl border p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{tExpense('supplier')}</span>
                  <span className="font-medium">{result.supplier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{tExpense('amount')}</span>
                  <span className="font-bold text-lg">
                    {result.amount.toLocaleString('sv-SE')} {result.currency === 'SEK' ? tc('kr') : result.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{tExpense('date')}</span>
                  <span className="font-medium">{result.date}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-14 rounded-xl"
                  onClick={() => {
                    setFile(null)
                    setPreview(null)
                    setResult(null)
                  }}
                >
                  {t('retake')}
                </Button>
                <Button
                  className="flex-1 h-14 rounded-xl"
                  onClick={saveExpense}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-5 w-5" />
                  )}
                  {tc('save')}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
