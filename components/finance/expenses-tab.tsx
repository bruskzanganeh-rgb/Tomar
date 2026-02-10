"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Receipt, BarChart3, Upload, Image, Download, Loader2, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { UploadReceiptDialog } from '@/components/expenses/upload-receipt-dialog'
import { EditExpenseDialog } from '@/components/expenses/edit-expense-dialog'
import { ExportDialog } from '@/components/expenses/export-dialog'
import { TableSkeleton } from '@/components/skeletons/table-skeleton'
import { format } from 'date-fns'
import { useDateLocale } from '@/lib/hooks/use-date-locale'
import { useFormatLocale } from '@/lib/hooks/use-format-locale'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { toast } from 'sonner'

type Expense = {
  id: string
  date: string
  supplier: string
  amount: number
  currency: string | null
  amount_base: number | null
  category: string | null
  notes: string | null
  attachment_url: string | null
  gig_id: string | null
  gig: {
    id: string
    project_name: string | null
    date: string
    client: { name: string } | null
  } | null
}

type Gig = {
  id: string
  date: string
  project_name: string | null
  venue: string | null
  status: string
  client: { name: string } | null
}

export default function ExpensesTab() {
  const t = useTranslations('expense')
  const tc = useTranslations('common')
  const tt = useTranslations('toast')
  const tg = useTranslations('gig')
  const dateLocale = useDateLocale()
  const formatLocale = useFormatLocale()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [gigFilter, setGigFilter] = useState<string>('all')
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [gigs, setGigs] = useState<Gig[]>([])

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadExpenses()
    loadGigs()
  }, [])

  async function loadExpenses() {
    setLoading(true)
    const { data, error } = await supabase
      .from('expenses')
      .select('*, gig:gigs(id, project_name, date, client:clients(name))')
      .order('date', { ascending: false })

    if (error) {
      console.error('Error loading expenses:', error)
    } else {
      setExpenses(data || [])
    }
    setLoading(false)
  }

  async function loadGigs() {
    const { data } = await supabase
      .from('gigs')
      .select('id, date, project_name, venue, status, client:clients(name)')
      .in('status', ['pending', 'accepted', 'completed', 'invoiced', 'paid'])
      .order('date', { ascending: false })

    setGigs((data || []) as unknown as Gig[])
  }

  async function openPreview(expenseId: string) {
    setPreviewOpen(true)
    setPreviewLoading(true)
    setPreviewUrl(null)

    try {
      const response = await fetch(`/api/expenses/${expenseId}/attachment`)
      if (response.ok) {
        const data = await response.json()
        setPreviewUrl(data.url)
      } else {
        toast.error(tt('couldNotLoadReceiptImage'))
        setPreviewOpen(false)
      }
    } catch (error) {
      console.error('Preview error:', error)
      toast.error(tt('genericError'))
      setPreviewOpen(false)
    } finally {
      setPreviewLoading(false)
    }
  }

  const years = [...new Set(expenses.map(e => new Date(e.date).getFullYear()))].sort((a, b) => b - a)
  const categories = [...new Set(expenses.map(e => e.category).filter(Boolean))].sort() as string[]
  const suppliers = [...new Set(expenses.map(e => e.supplier))].sort()

  const filteredExpenses = expenses.filter(e => {
    if (yearFilter !== 'all' && new Date(e.date).getFullYear().toString() !== yearFilter) return false
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
    if (supplierFilter !== 'all' && e.supplier !== supplierFilter) return false
    if (gigFilter === 'linked' && !e.gig_id) return false
    if (gigFilter === 'unlinked' && e.gig_id) return false
    return true
  })

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount_base || e.amount), 0)

  const yearlyData = years.map(year => {
    const yearExpenses = expenses.filter(e => new Date(e.date).getFullYear() === year)
    const total = yearExpenses.reduce((sum, e) => sum + (e.amount_base || e.amount), 0)
    return {
      year: year.toString(),
      total: Math.round(total),
      count: yearExpenses.length
    }
  }).sort((a, b) => parseInt(a.year) - parseInt(b.year))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => setShowExportDialog(true)}>
          <Download className="mr-2 h-4 w-4" />
          {tc('export')}
        </Button>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="mr-2 h-4 w-4" />
          {t('uploadReceipt')}
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-4 flex-wrap">
        <div className="w-32">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('allYears')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allYears')}</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('allCategories')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allCategories')}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('allSuppliers')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allSuppliers')}</SelectItem>
              {suppliers.map((sup) => (
                <SelectItem key={sup} value={sup}>{sup}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={gigFilter} onValueChange={setGigFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('allGigs')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allGigs')}</SelectItem>
              <SelectItem value="linked">{t('withGig')}</SelectItem>
              <SelectItem value="unlinked">{t('withoutGig')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {yearFilter !== 'all' || categoryFilter !== 'all' || supplierFilter !== 'all' || gigFilter !== 'all'
                ? `${t('filteredExpenses')} ${yearFilter !== 'all' ? yearFilter : ''} (${filteredExpenses.length} / ${expenses.length})`
                : t('totalExpenses')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalExpenses.toLocaleString(formatLocale)} {tc('kr')}
            </div>
          </CardContent>
        </Card>

        {yearlyData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                {t('expensesPerYear')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearlyData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      width={40}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString(formatLocale)} ${tc('kr')}`, tc('total')]}
                      labelFormatter={(label) => `${t('year')} ${label}`}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {yearlyData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.year === yearFilter ? '#3b82f6' : '#93c5fd'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {yearFilter !== 'all' || categoryFilter !== 'all' || supplierFilter !== 'all' || gigFilter !== 'all'
              ? `${t('expenses')} ${yearFilter !== 'all' ? yearFilter : ''} (${filteredExpenses.length} / ${expenses.length})`
              : `${t('allExpenses')} (${expenses.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton columns={7} rows={5} />
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {expenses.length === 0 ? (
                <>
                  <p>{t('noExpensesYet')}</p>
                  <p className="text-sm">
                    {t('uploadOrImportHint')}
                  </p>
                </>
              ) : (
                <p>{t('noExpensesMatchFilter')}</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('supplier')}</TableHead>
                  <TableHead>{t('category')}</TableHead>
                  <TableHead>{t('gig')}</TableHead>
                  <TableHead>{t('amount')}</TableHead>
                  <TableHead>{t('notes')}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow
                    key={expense.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedExpense(expense)}
                  >
                    <TableCell>
                      {format(new Date(expense.date), 'PPP', { locale: dateLocale })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {expense.supplier}
                    </TableCell>
                    <TableCell>
                      {expense.category ? (
                        <Badge variant="outline">{expense.category}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {expense.gig ? (
                        <Badge variant="secondary" className="text-xs">
                          {expense.gig.client?.name || expense.gig.project_name || format(new Date(expense.gig.date), 'd MMM', { locale: dateLocale })}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {expense.currency && expense.currency !== 'SEK' ? (
                        <div>
                          <span>{expense.amount.toLocaleString(formatLocale)} {expense.currency === 'EUR' ? '\u20AC' : '$'}</span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({expense.amount_base?.toLocaleString(formatLocale)} {tc('kr')})
                          </span>
                        </div>
                      ) : (
                        <span>{expense.amount.toLocaleString(formatLocale)} {tc('kr')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {expense.notes || '-'}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {expense.attachment_url && (
                        <button
                          onClick={() => openPreview(expense.id)}
                          className="p-1 hover:bg-blue-50 rounded transition-colors"
                          title={t('showReceiptImage')}
                        >
                          <Image className="h-4 w-4 text-blue-500" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UploadReceiptDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onSuccess={loadExpenses}
      />

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      />

      <EditExpenseDialog
        expense={selectedExpense}
        open={selectedExpense !== null}
        onOpenChange={(open) => !open && setSelectedExpense(null)}
        onSuccess={loadExpenses}
        gigs={gigs}
      />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[600px] p-0">
          <DialogTitle className="sr-only">{t('receiptPreview')}</DialogTitle>
          <div className="relative">
            <button
              onClick={() => setPreviewOpen(false)}
              className="absolute top-2 right-2 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            {previewLoading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt={t('receipt')}
                className="w-full max-h-[80vh] object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-96 text-gray-500">
                {t('couldNotLoadImage')}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
