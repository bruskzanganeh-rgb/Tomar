"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  uploadGigAttachment,
  deleteGigAttachment,
  getGigAttachments,
  getSignedUrl,
  type GigAttachment,
  type AttachmentCategory
} from '@/lib/supabase/storage'
import { FileText, Upload, Trash2, Download, Loader2, AlertCircle, Music, FileCheck, CalendarDays } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useTranslations } from 'next-intl'
import { downloadFile } from '@/lib/download'

type CategoryConfig = Record<AttachmentCategory, { label: string; description: string; color: string; icon: typeof FileText }>

const categoryColors: Record<AttachmentCategory, { color: string; icon: typeof FileText }> = {
  gig_info: { color: 'bg-blue-100 text-blue-800', icon: Music },
  invoice_doc: { color: 'bg-green-100 text-green-800', icon: FileCheck },
  schedule: { color: 'bg-purple-100 text-purple-800', icon: CalendarDays },
}

type GigAttachmentsProps = {
  gigId: string
  disabled?: boolean
}

type AttachmentRowProps = {
  attachment: GigAttachment
  onDownload: (attachment: GigAttachment) => void
  onDelete: (attachment: GigAttachment) => void
  disabled?: boolean
  categoryConfig: CategoryConfig
  openFileLabel: string
  deleteFileLabel: string
}

function AttachmentRow({ attachment, onDownload, onDelete, disabled, categoryConfig, openFileLabel, deleteFileLabel }: AttachmentRowProps) {
  const category = attachment.category || 'gig_info'
  const config = categoryConfig[category]
  const Icon = config.icon

  return (
    <div className="flex items-center justify-between p-2 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{attachment.file_name}</p>
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${config.color}`}>
              {config.label}
            </Badge>
          </div>
          {/* File size and date removed for compact view */}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDownload(attachment)}
          title={openFileLabel}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(attachment)}
          disabled={disabled}
          title={deleteFileLabel}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
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
  const [selectedCategory, setSelectedCategory] = useState<AttachmentCategory>('gig_info')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categoryConfig: CategoryConfig = {
    gig_info: {
      label: t('gigInfo'),
      description: t('gigInfoDescription'),
      ...categoryColors.gig_info,
    },
    invoice_doc: {
      label: t('invoiceDoc'),
      description: t('invoiceDocDescription'),
      ...categoryColors.invoice_doc,
    },
    schedule: {
      label: t('schedule'),
      description: t('scheduleDescription'),
      ...categoryColors.schedule,
    },
  }

  useEffect(() => {
    loadAttachments()
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
        // Validate file type
        if (file.type !== 'application/pdf') {
          setError(t('onlyPdf'))
          continue
        }

        // Validate file size (10 MB max)
        if (file.size > 10 * 1024 * 1024) {
          setError(t('fileTooLarge'))
          continue
        }

        const attachment = await uploadGigAttachment(gigId, file, selectedCategory)
        setAttachments(prev => [attachment, ...prev])
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'STORAGE_QUOTA_EXCEEDED') {
        setError(ts('storageQuotaFull'))
      } else {
        setError(err instanceof Error ? err.message : t('uploadError'))
      }
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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
      setAttachments(prev => prev.filter(a => a.id !== attachment.id))
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

  // Group attachments by category
  const gigInfoAttachments = attachments.filter(a => a.category === 'gig_info' || !a.category)
  const invoiceDocAttachments = attachments.filter(a => a.category === 'invoice_doc')
  const scheduleAttachments = attachments.filter(a => a.category === 'schedule')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{t('attachmentsPdf')}</Label>
        <div className="flex items-center gap-2">
          <Select
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value as AttachmentCategory)}
            disabled={disabled || uploading}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gig_info">
                <span className="flex items-center gap-1">
                  <Music className="h-3 w-3" />
                  {t('gigInfo')}
                </span>
              </SelectItem>
              <SelectItem value="invoice_doc">
                <span className="flex items-center gap-1">
                  <FileCheck className="h-3 w-3" />
                  {t('invoiceDoc')}
                </span>
              </SelectItem>
              <SelectItem value="schedule">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {t('schedule')}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
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
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
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
        <div className="space-y-4">
          {/* Gig-info section */}
          {gigInfoAttachments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Music className="h-3 w-3" />
                <span>{t('gigInfo')} ({gigInfoAttachments.length})</span>
              </div>
              {gigInfoAttachments.map(attachment => (
                <AttachmentRow
                  key={attachment.id}
                  attachment={attachment}
                  onDownload={handleDownload}
                  onDelete={confirmDelete}
                  disabled={disabled}
                  categoryConfig={categoryConfig}
                  openFileLabel={t('openFile')}
                  deleteFileLabel={t('deleteFile')}
                />
              ))}
            </div>
          )}

          {/* Invoice documents section */}
          {invoiceDocAttachments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileCheck className="h-3 w-3" />
                <span>{t('invoiceDoc')} ({invoiceDocAttachments.length})</span>
              </div>
              {invoiceDocAttachments.map(attachment => (
                <AttachmentRow
                  key={attachment.id}
                  attachment={attachment}
                  onDownload={handleDownload}
                  onDelete={confirmDelete}
                  disabled={disabled}
                  categoryConfig={categoryConfig}
                  openFileLabel={t('openFile')}
                  deleteFileLabel={t('deleteFile')}
                />
              ))}
            </div>
          )}

          {/* Schedule section */}
          {scheduleAttachments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                <span>{t('schedule')} ({scheduleAttachments.length})</span>
              </div>
              {scheduleAttachments.map(attachment => (
                <AttachmentRow
                  key={attachment.id}
                  attachment={attachment}
                  onDownload={handleDownload}
                  onDelete={confirmDelete}
                  disabled={disabled}
                  categoryConfig={categoryConfig}
                  openFileLabel={t('openFile')}
                  deleteFileLabel={t('deleteFile')}
                />
              ))}
            </div>
          )}
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
