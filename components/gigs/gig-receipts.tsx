"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Receipt, Plus, Loader2, ExternalLink, Trash2 } from 'lucide-react'
import { UploadReceiptDialog } from '@/components/expenses/upload-receipt-dialog'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type Expense = {
  id: string
  date: string
  supplier: string
  amount: number
  currency: string | null
  amount_sek: number | null
  category: string | null
  attachment_url: string | null
}

type GigReceiptsProps = {
  gigId: string
  gigTitle?: string
  disabled?: boolean
}

export function GigReceipts({ gigId, gigTitle, disabled }: GigReceiptsProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadExpenses()
  }, [gigId])

  async function loadExpenses() {
    setLoading(true)
    const { data, error } = await supabase
      .from('expenses')
      .select('id, date, supplier, amount, currency, amount_sek, category, attachment_url')
      .eq('gig_id', gigId)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error loading gig receipts:', error)
    } else {
      setExpenses(data || [])
    }
    setLoading(false)
  }

  function confirmDelete(expenseId: string) {
    setExpenseToDelete(expenseId)
    setDeleteConfirmOpen(true)
  }

  async function handleDelete(expenseId: string) {
    setDeleting(expenseId)
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (error) {
      console.error('Error deleting expense:', error)
      toast.error('Kunde inte ta bort kvitto')
    } else {
      loadExpenses()
    }
    setDeleting(null)
  }

  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount_sek || e.amount), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Kvitton</h3>
          {expenses.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {expenses.length} st • {totalAmount.toLocaleString('sv-SE')} kr
            </Badge>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowUploadDialog(true)}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-1" />
          Lägg till
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : expenses.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Inga kvitton kopplade till detta uppdrag
        </p>
      ) : (
        <div className="space-y-2">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between p-2 rounded-lg border bg-white"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {expense.supplier}
                  </span>
                  {expense.category && (
                    <Badge variant="outline" className="text-xs">
                      {expense.category}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(expense.date), 'PPP', { locale: sv })} •{' '}
                  {expense.currency && expense.currency !== 'SEK' ? (
                    <>
                      {expense.amount.toLocaleString('sv-SE')} {expense.currency === 'EUR' ? '€' : expense.currency}{' '}
                      ({expense.amount_sek?.toLocaleString('sv-SE')} kr)
                    </>
                  ) : (
                    <>{expense.amount.toLocaleString('sv-SE')} kr</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {expense.attachment_url && (
                  <a
                    href={expense.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="Visa kvitto"
                  >
                    <ExternalLink className="h-4 w-4 text-blue-600" />
                  </a>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => confirmDelete(expense.id)}
                  disabled={deleting === expense.id}
                >
                  {deleting === expense.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadReceiptDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onSuccess={() => {
          setShowUploadDialog(false)
          loadExpenses()
        }}
        gigId={gigId}
        gigTitle={gigTitle}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open)
          if (!open) setExpenseToDelete(null)
        }}
        title="Ta bort kvitto"
        description="Är du säker på att du vill ta bort detta kvitto?"
        confirmLabel="Ta bort"
        variant="destructive"
        onConfirm={() => {
          if (expenseToDelete) {
            handleDelete(expenseToDelete)
          }
          setDeleteConfirmOpen(false)
          setExpenseToDelete(null)
        }}
      />
    </div>
  )
}
