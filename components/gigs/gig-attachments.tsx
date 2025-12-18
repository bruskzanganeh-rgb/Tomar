"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  uploadGigAttachment,
  deleteGigAttachment,
  getGigAttachments,
  getSignedUrl,
  formatFileSize,
  type GigAttachment
} from '@/lib/supabase/storage'
import { FileText, Upload, Trash2, Download, Loader2, AlertCircle } from 'lucide-react'

type GigAttachmentsProps = {
  gigId: string
  disabled?: boolean
}

export function GigAttachments({ gigId, disabled }: GigAttachmentsProps) {
  const [attachments, setAttachments] = useState<GigAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

        const attachment = await uploadGigAttachment(gigId, file)
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

  async function handleDelete(attachment: GigAttachment) {
    if (!confirm(`Är du säker på att du vill ta bort "${attachment.file_name}"?`)) {
      return
    }

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Bilagor (PDF)</Label>
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
        <div className="space-y-2">
          {attachments.map(attachment => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-2 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.file_name}</p>
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
                  onClick={() => handleDownload(attachment)}
                  title="Öppna fil"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(attachment)}
                  disabled={disabled}
                  title="Ta bort fil"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
