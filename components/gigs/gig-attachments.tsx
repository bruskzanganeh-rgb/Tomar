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
  formatFileSize,
  type GigAttachment,
  type AttachmentCategory
} from '@/lib/supabase/storage'
import { FileText, Upload, Trash2, Download, Loader2, AlertCircle, Music, FileCheck } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const categoryConfig: Record<AttachmentCategory, { label: string; description: string; color: string; icon: typeof FileText }> = {
  gig_info: {
    label: 'Gig-info',
    description: 'Noter, schema, repertoar',
    color: 'bg-blue-100 text-blue-800',
    icon: Music
  },
  invoice_doc: {
    label: 'Fakturaunderlag',
    description: 'Kontrakt, PO, avtal',
    color: 'bg-green-100 text-green-800',
    icon: FileCheck
  }
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
}

function AttachmentRow({ attachment, onDownload, onDelete, disabled }: AttachmentRowProps) {
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
          <p className="text-xs text-muted-foreground">
            {formatFileSize(attachment.file_size)} •{' '}
            {new Date(attachment.uploaded_at).toLocaleDateString('sv-SE')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDownload(attachment)}
          title="Öppna fil"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(attachment)}
          disabled={disabled}
          title="Ta bort fil"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

export function GigAttachments({ gigId, disabled }: GigAttachmentsProps) {
  const [attachments, setAttachments] = useState<GigAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [attachmentToDelete, setAttachmentToDelete] = useState<GigAttachment | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<AttachmentCategory>('gig_info')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      setError(err instanceof Error ? err.message : 'Kunde inte ladda bilagor')
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
          setError('Endast PDF-filer är tillåtna')
          continue
        }

        // Validate file size (10 MB max)
        if (file.size > 10 * 1024 * 1024) {
          setError('Filen är för stor (max 10 MB)')
          continue
        }

        const attachment = await uploadGigAttachment(gigId, file, selectedCategory)
        setAttachments(prev => [attachment, ...prev])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda upp fil')
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
      setError(err instanceof Error ? err.message : 'Kunde inte ta bort fil')
    }
  }

  async function handleDownload(attachment: GigAttachment) {
    try {
      setError(null)
      const url = await getSignedUrl(attachment.file_path)
      if (url) {
        window.open(url, '_blank')
      } else {
        setError('Kunde inte hämta nedladdningslänk')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte öppna fil')
    }
  }

  // Group attachments by category
  const gigInfoAttachments = attachments.filter(a => a.category === 'gig_info' || !a.category)
  const invoiceDocAttachments = attachments.filter(a => a.category === 'invoice_doc')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Bilagor (PDF)</Label>
        <div className="flex items-center gap-2">
          <Select
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value as AttachmentCategory)}
            disabled={disabled || uploading}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gig_info">
                <span className="flex items-center gap-1">
                  <Music className="h-3 w-3" />
                  Gig-info
                </span>
              </SelectItem>
              <SelectItem value="invoice_doc">
                <span className="flex items-center gap-1">
                  <FileCheck className="h-3 w-3" />
                  Fakturaunderlag
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
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            Ladda upp
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
        <div className="text-sm text-muted-foreground py-2">Laddar bilagor...</div>
      ) : attachments.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2 border border-dashed rounded-lg text-center p-4">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Inga bilagor uppladdade
        </div>
      ) : (
        <div className="space-y-4">
          {/* Gig-info section */}
          {gigInfoAttachments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Music className="h-3 w-3" />
                <span>Gig-info ({gigInfoAttachments.length})</span>
              </div>
              {gigInfoAttachments.map(attachment => (
                <AttachmentRow
                  key={attachment.id}
                  attachment={attachment}
                  onDownload={handleDownload}
                  onDelete={confirmDelete}
                  disabled={disabled}
                />
              ))}
            </div>
          )}

          {/* Invoice documents section */}
          {invoiceDocAttachments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileCheck className="h-3 w-3" />
                <span>Fakturaunderlag ({invoiceDocAttachments.length})</span>
              </div>
              {invoiceDocAttachments.map(attachment => (
                <AttachmentRow
                  key={attachment.id}
                  attachment={attachment}
                  onDownload={handleDownload}
                  onDelete={confirmDelete}
                  disabled={disabled}
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
        title="Ta bort bilaga"
        description={`Är du säker på att du vill ta bort "${attachmentToDelete?.file_name}"?`}
        confirmLabel="Ta bort"
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
