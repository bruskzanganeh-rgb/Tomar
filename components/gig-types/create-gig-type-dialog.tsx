"use client"

import { useState } from 'react'
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
import { Loader2 } from 'lucide-react'

type CreateGigTypeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateGigTypeDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateGigTypeDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    vat_rate: '0',
    color: '#3b82f6',
  })

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('gig_types').insert([
      {
        name: formData.name,
        vat_rate: parseFloat(formData.vat_rate),
        color: formData.color,
        is_default: false,
      },
    ])

    setLoading(false)

    if (error) {
      console.error('Error creating gig type:', error)
      alert('Kunde inte skapa uppdragstyp: ' + error.message)
    } else {
      setFormData({
        name: '',
        vat_rate: '0',
        color: '#3b82f6',
      })
      onSuccess()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ny uppdragstyp</DialogTitle>
            <DialogDescription>
              Skapa en ny typ av uppdrag med egen momssats
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Namn <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="T.ex. Session, Arrangemang"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="vat_rate">
                Momssats (%) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vat_rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.vat_rate}
                onChange={(e) =>
                  setFormData({ ...formData, vat_rate: e.target.value })
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                T.ex. 0, 6, 12, 25
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="color">Färg</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="w-20 h-10"
                />
                <span className="text-sm text-muted-foreground">
                  {formData.color}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Skapa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
