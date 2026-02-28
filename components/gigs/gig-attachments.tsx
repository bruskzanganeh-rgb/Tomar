'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  uploadGigAttachment,
  deleteGigAttachment,
  getGigAttachments,
  getSignedUrl,
  updateGigAttachmentCategory,
  type GigAttachment,
  type AttachmentCategory,
} from '@/lib/supabase/storage'
import { FileText, Upload, Trash2, Download, Loader2, AlertCircle } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useTranslations } from 'next-intl'
import { downloadFile } from '@/lib/download'

type CategoryLabels = Record<AttachmentCategory, string>

type GigAttachmentsProps = {
  gigId: string
  disabled?: boolean
}

type AttachmentRowProps = {
  attachment: GigAttachment
  onDownload: (attachment: GigAttachment) => void
  onDelete: (attachment: GigAttachment) => void
  onCategoryChange: (attachment: GigAttachment, category: AttachmentCategory) => void
  disabled?: boolean
  categoryLabels: CategoryLabels
  openFileLabel: string
  deleteFileLabel: string
}

function AttachmentRow({
  attachment,
  onDownload,
  onDelete,
  onCategoryChange,
  disabled,
  categoryLabels,
  openFileLabel,
  deleteFileLabel,
}: AttachmentRowProps) {
  const category = attachment.category || 'gig_info'

  return (
    <div className="flex items-center justify-between p-2 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
        <p className="text-sm font-medium truncate min-w-0 flex-1">{attachment.file_name}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Select
          value={category}
          onValueChange={(value) => onCategoryChange(attachment, value as AttachmentCategory)}
          disabled={disabled}
        >
          <SelectTrigger className="h-6 text-[10px] w-auto min-w-0 px-2 border-0 bg-transparent hover:bg-gray-200 gap-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gig_info">{categoryLabels.gig_info}</SelectItem>
            <SelectItem value="invoice_doc">{categoryLabels.invoice_doc}</SelectItem>
            <SelectItem value="schedule">{categoryLabels.schedule}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onDownload(attachment)}
          title={openFileLabel}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onDelete(attachment)}
          disabled={disabled}
          title={deleteFileLabel}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

export function GigAttachments({ gigId, disabled }: GigAttachmentsProps) {
  const t = useTranslations('gig')
  const tc = useTranslations('common')
  const ts = useTranslations('subscription')
  const [attachments, setAttachments] = useState<GigAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [attachmentToDelete, setAttachmentToDelete] = useState<GigAttachment | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categoryLabels: CategoryLabels = {
    gig_info: t('gigInfo'),
    invoice_doc: t('invoiceDoc'),
    schedule: t('schedule'),
  }

  useEffect(() => {
    loadAttachments()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAttachments uses gigId which is already in deps
  }, [gigId])

  async function loadAttachments() {
    try {
      setLoading(true)
      setError(null)
      const data = await getGigAttachments(gigId)
      setAttachments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadError'))
    } finally {
      setLoading(false)
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      for (const file of Array.from(files)) {
        if (file.type !== 'application/pdf') {
          setError(t('onlyPdf'))
          continue
        }

        if (file.size > 10 * 1024 * 1024) {
          setError(t('fileTooLarge'))
          continue
        }

        const attachment = await uploadGigAttachment(gigId, file)
        setAttachments((prev) => [attachment, ...prev])
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'STORAGE_QUOTA_EXCEEDED') {
        setError(ts('storageQuotaFull'))
      } else {
        setError(err instanceof Error ? err.message : t('uploadError'))
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleCategoryChange(attachment: GigAttachment, category: AttachmentCategory) {
    try {
      setError(null)
      const updated = await updateGigAttachmentCategory(attachment.id, category)
      setAttachments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('updateError'))
    }
  }

  function confirmDelete(attachment: GigAttachment) {
    setAttachmentToDelete(attachment)
    setDeleteConfirmOpen(true)
  }

  async function handleDelete(attachment: GigAttachment) {
    try {
      setError(null)
      await deleteGigAttachment(attachment.id, attachment.file_path)
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deleteError'))
    }
  }

  async function handleDownload(attachment: GigAttachment) {
    try {
      setError(null)
      const url = await getSignedUrl(attachment.file_path)
      if (url) {
        await downloadFile(url, attachment.file_name)
      } else {
        setError(t('downloadError'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('openError'))
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{t('attachmentsPdf')}</Label>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={disabled || uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground py-2">{t('loadingAttachments')}</div>
      ) : attachments.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2 border border-dashed rounded-lg text-center p-4">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          {t('noAttachments')}
        </div>
      ) : (
        <div className="space-y-1.5">
          {attachments.map((attachment) => (
            <AttachmentRow
              key={attachment.id}
              attachment={attachment}
              onDownload={handleDownload}
              onDelete={confirmDelete}
              onCategoryChange={handleCategoryChange}
              disabled={disabled}
              categoryLabels={categoryLabels}
              openFileLabel={t('openFile')}
              deleteFileLabel={t('deleteFile')}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open)
          if (!open) setAttachmentToDelete(null)
        }}
        title={t('deleteAttachment')}
        description={t('deleteAttachmentConfirm', { name: attachmentToDelete?.file_name || '' })}
        confirmLabel={tc('delete')}
        variant="destructive"
        onConfirm={() => {
          if (attachmentToDelete) {
            handleDelete(attachmentToDelete)
          }
          setDeleteConfirmOpen(false)
          setAttachmentToDelete(null)
        }}
      />
    </div>
  )
}
