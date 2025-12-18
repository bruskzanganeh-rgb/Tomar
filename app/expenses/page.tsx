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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Receipt, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type Expense = {
  id: string
  date: string
  supplier: string
  amount: number
  currency: string | null
  amount_sek: number | null
  category: string | null
  notes: string | null
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    loadExpenses()
  }, [])

  async function loadExpenses() {
    setLoading(true)
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error('Error loading expenses:', error)
    } else {
      setExpenses(data || [])
    }
    setLoading(false)
  }

  // Unika år, kategorier och leverantörer för filter
  const years = [...new Set(expenses.map(e => new Date(e.date).getFullYear()))].sort((a, b) => b - a)
  const categories = [...new Set(expenses.map(e => e.category).filter(Boolean))].sort() as string[]
  const suppliers = [...new Set(expenses.map(e => e.supplier))].sort()

  // Filtrera utgifter
  const filteredExpenses = expenses.filter(e => {
    if (yearFilter !== 'all' && new Date(e.date).getFullYear().toString() !== yearFilter) return false
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
    if (supplierFilter !== 'all' && e.supplier !== supplierFilter) return false
    return true
  })

  // Använd amount_sek för total (konverterad SEK)
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount_sek || e.amount), 0)

  // Data för stapeldiagram per år
  const yearlyData = years.map(year => {
    const yearExpenses = expenses.filter(e => new Date(e.date).getFullYear() === year)
    const total = yearExpenses.reduce((sum, e) => sum + (e.amount_sek || e.amount), 0)
    return {
      year: year.toString(),
      total: Math.round(total),
      count: yearExpenses.length
    }
  }).sort((a, b) => parseInt(a.year) - parseInt(b.year))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Utgifter</h1>
          <p className="text-muted-foreground">
            Hantera dina kvitton och utgifter
          </p>
        </div>
        <Button onClick={() => alert('Dropbox-import kommer snart!')}>
          <Plus className="mr-2 h-4 w-4" />
          Importera från Dropbox
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-4 flex-wrap">
        <div className="w-32">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Alla år" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla år</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Alla kategorier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla kategorier</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Alla leverantörer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla leverantörer</SelectItem>
              {suppliers.map((sup) => (
                <SelectItem key={sup} value={sup}>{sup}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {yearFilter !== 'all' || categoryFilter !== 'all' || supplierFilter !== 'all'
                ? `Filtrerade utgifter ${yearFilter !== 'all' ? yearFilter : ''} (${filteredExpenses.length} av ${expenses.length})`
                : 'Totala utgifter'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalExpenses.toLocaleString('sv-SE')} kr
            </div>
          </CardContent>
        </Card>

        {yearlyData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Utgifter per år
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
                      formatter={(value: number) => [`${value.toLocaleString('sv-SE')} kr`, 'Total']}
                      labelFormatter={(label) => `År ${label}`}
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
            {yearFilter !== 'all' || categoryFilter !== 'all' || supplierFilter !== 'all'
              ? `Utgifter ${yearFilter !== 'all' ? yearFilter : ''} (${filteredExpenses.length} av ${expenses.length})`
              : `Alla utgifter (${expenses.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Laddar...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {expenses.length === 0 ? (
                <>
                  <p>Inga utgifter än</p>
                  <p className="text-sm">
                    Du kan importera kvitton från Dropbox senare
                  </p>
                </>
              ) : (
                <p>Inga utgifter matchar filtret</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Leverantör</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Belopp</TableHead>
                  <TableHead>Anteckningar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {format(new Date(expense.date), 'PPP', { locale: sv })}
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
                    <TableCell className="font-medium">
                      {expense.currency && expense.currency !== 'SEK' ? (
                        <div>
                          <span>{expense.amount.toLocaleString('sv-SE')} {expense.currency === 'EUR' ? '€' : '$'}</span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({expense.amount_sek?.toLocaleString('sv-SE')} kr)
                          </span>
                        </div>
                      ) : (
                        <span>{expense.amount.toLocaleString('sv-SE')} kr</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {expense.notes || '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
