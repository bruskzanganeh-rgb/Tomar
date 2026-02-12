"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2, Mail, Phone, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CreateClientDialog } from '@/components/clients/create-client-dialog'
import { EditClientDialog } from '@/components/clients/edit-client-dialog'
import { TableSkeleton } from '@/components/skeletons/table-skeleton'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

type Client = {
  id: string
  name: string
  org_number: string | null
  client_code: string | null
  email: string | null
  address: string | null
  payment_terms: number
  reference_person: string | null
  notes: string | null
  invoice_language: string | null
  country_code: string | null
  vat_number: string | null
  created_at: string
  invoices: { total: number }[]
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<string | null>(null)
  const supabase = createClient()
  const t = useTranslations('client')
  const tc = useTranslations('common')

  useEffect(() => {
    loadClients()
  }, [])

  async function loadClients() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        invoices(total)
      `)
      .order('name')

    if (error) {
      console.error('Error loading clients:', error)
    } else {
      setClients(data || [])
    }
    setLoading(false)
  }

  function confirmDelete(id: string) {
    setClientToDelete(id)
    setDeleteConfirmOpen(true)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting client:', error)
      toast.error(t('couldNotDeleteClient'))
    } else {
      loadClients()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('newClient')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('allClients', { count: clients.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton columns={5} rows={5} />
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('noClientsYet')}</p>
              <p className="text-sm">{t('noClientsHint')}</p>
            </div>
          ) : (
            <>
            {/* Mobile card view */}
            <div className="md:hidden space-y-2">
              {clients.map((client) => {
                const invoiceCount = client.invoices?.length || 0
                const totalInvoiced = client.invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0
                return (
                  <div key={client.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Link href={`/clients/${client.id}`} className="font-medium text-sm hover:text-primary hover:underline">
                          {client.name}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {invoiceCount} {t('invoicesColumn').toLowerCase()} · {totalInvoiced > 0 ? `${totalInvoiced.toLocaleString('sv-SE')} ${tc('kr')}` : '-'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingClient(client)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => confirmDelete(client.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead className="text-right">{t('invoicesColumn')}</TableHead>
                  <TableHead className="text-right">{t('invoicedColumn')}</TableHead>
                  <TableHead>{t('orgNumber')}</TableHead>
                  <TableHead>{t('paymentTerms')}</TableHead>
                  <TableHead className="text-right">{t('actionsColumn')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => {
                  const invoiceCount = client.invoices?.length || 0
                  const totalInvoiced = client.invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0

                  return (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/clients/${client.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {client.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-medium">
                          {invoiceCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-medium">
                          {totalInvoiced > 0 ? `${totalInvoiced.toLocaleString('sv-SE')} ${tc('kr')}` : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {client.org_number || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {client.payment_terms} {tc('days')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingClient(client)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmDelete(client.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <CreateClientDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={loadClients}
      />

      <EditClientDialog
        client={editingClient}
        open={editingClient !== null}
        onOpenChange={(open) => !open && setEditingClient(null)}
        onSuccess={loadClients}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open)
          if (!open) setClientToDelete(null)
        }}
        title={t('deleteClient')}
        description={t('deleteConfirm')}
        confirmLabel={tc('delete')}
        variant="destructive"
        onConfirm={() => {
          if (clientToDelete) {
            handleDelete(clientToDelete)
          }
          setDeleteConfirmOpen(false)
          setClientToDelete(null)
        }}
      />
    </div>
  )
}
