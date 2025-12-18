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
import { Loader2 } from 'lucide-react'

type Client = {
  id: string
  name: string
  org_number: string | null
  client_code: string | null
  address: string | null
  payment_terms: number
  notes: string | null
}

type EditClientDialogProps = {
  client: Client | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditClientDialog({
  client,
  open,
  onOpenChange,
  onSuccess,
}: EditClientDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    client_code: '',
    org_number: '',
    address: '',
    payment_terms: '30',
    notes: '',
  })

  const supabase = createClient()

  // Populate form when client changes
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        client_code: client.client_code || '',
        org_number: client.org_number || '',
        address: client.address || '',
        payment_terms: client.payment_terms.toString(),
        notes: client.notes || '',
      })
    }
  }, [client])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!client) return

    setLoading(true)

    const { error } = await supabase
      .from('clients')
      .update({
        name: formData.name,
        client_code: formData.client_code || null,
        org_number: formData.org_number || null,
        address: formData.address || null,
        payment_terms: parseInt(formData.payment_terms),
        notes: formData.notes || null,
      })
      .eq('id', client.id)

    setLoading(false)

    if (error) {
      console.error('Error updating client:', error)
      alert('Kunde inte uppdatera uppdragsgivare: ' + error.message)
    } else {
      onSuccess()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Redigera uppdragsgivare</DialogTitle>
            <DialogDescription>
              Uppdatera information för {client?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                Namn <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                placeholder="T.ex. Göteborgs Symfoniker"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-client_code">Kund-ID</Label>
                <Input
                  id="edit-client_code"
                  placeholder="T.ex. LKH 1121"
                  value={formData.client_code}
                  onChange={(e) =>
                    setFormData({ ...formData, client_code: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Valfritt ID för intern referens
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-org_number">Org.nr</Label>
                <Input
                  id="edit-org_number"
                  placeholder="123456-7890"
                  value={formData.org_number}
                  onChange={(e) =>
                    setFormData({ ...formData, org_number: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-address">Adress</Label>
              <Input
                id="edit-address"
                placeholder="Gatan 1, 123 45 Stad"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-payment_terms">Betalningsvillkor (dagar)</Label>
              <Input
                id="edit-payment_terms"
                type="number"
                min="1"
                value={formData.payment_terms}
                onChange={(e) =>
                  setFormData({ ...formData, payment_terms: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Anteckningar</Label>
              <Input
                id="edit-notes"
                placeholder="T.ex. Föredrar email-fakturor"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
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
              Spara ändringar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
