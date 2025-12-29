"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClientSchema, type CreateClientFormData } from '@/lib/schemas/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Client = {
  id: string
  name: string
  org_number: string | null
  client_code: string | null
  email: string | null
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
  const supabase = createClient()

  const form = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: '',
      client_code: '',
      org_number: '',
      email: '',
      address: '',
      payment_terms: '30',
      notes: '',
    },
  })

  // Populate form when client changes
  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        client_code: client.client_code || '',
        org_number: client.org_number || '',
        email: client.email || '',
        address: client.address || '',
        payment_terms: client.payment_terms.toString(),
        notes: client.notes || '',
      })
    }
  }, [client, form])

  async function onSubmit(data: CreateClientFormData) {
    if (!client) return

    setLoading(true)

    const { error } = await supabase
      .from('clients')
      .update({
        name: data.name,
        client_code: data.client_code || null,
        org_number: data.org_number || null,
        email: data.email || null,
        address: data.address || null,
        payment_terms: parseInt(data.payment_terms),
        notes: data.notes || null,
      })
      .eq('id', client.id)

    setLoading(false)

    if (error) {
      console.error('Error updating client:', error)
      toast.error('Kunde inte uppdatera uppdragsgivare: ' + error.message)
    } else {
      onSuccess()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Redigera uppdragsgivare</DialogTitle>
              <DialogDescription>
                Uppdatera information för {client?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Namn <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="T.ex. Göteborgs Symfoniker" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="client_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kund-ID</FormLabel>
                      <FormControl>
                        <Input placeholder="T.ex. LKH 1121" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Valfritt ID för intern referens
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="org_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Org.nr</FormLabel>
                      <FormControl>
                        <Input placeholder="123456-7890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-post</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="faktura@orkester.se" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      För att skicka fakturor via e-post
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adress</FormLabel>
                    <FormControl>
                      <Input placeholder="Gatan 1, 123 45 Stad" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Betalningsvillkor (dagar)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anteckningar</FormLabel>
                    <FormControl>
                      <Input placeholder="T.ex. Föredrar email-fakturor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
        </Form>
      </DialogContent>
    </Dialog>
  )
}
