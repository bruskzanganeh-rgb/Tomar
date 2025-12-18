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
import { Textarea } from '@/components/ui/textarea'
import { Plus, Calendar, Check, X, Clock, FileText, DollarSign, Trash2, Edit, MapPin, ChevronDown, Pencil, HelpCircle } from 'lucide-react'
import { GigAttachments } from '@/components/gigs/gig-attachments'
import { CreateGigDialog } from '@/components/gigs/create-gig-dialog'
import { EditGigDialog } from '@/components/gigs/edit-gig-dialog'
import { CreateInvoiceDialog } from '@/components/invoices/create-invoice-dialog'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

type Gig = {
  id: string
  date: string
  start_date: string | null
  end_date: string | null
  total_days: number
  venue: string | null
  fee: number | null
  travel_expense: number | null
  project_name: string | null
  status: string
  notes: string | null
  client_id: string | null
  gig_type_id: string
  position_id: string | null
  client: { name: string; payment_terms: number } | null
  gig_type: { name: string; vat_rate: number; color: string | null }
  position: { name: string } | null
  gig_dates: { date: string }[]
}

function formatGigDates(gig: Gig): string {
  if (!gig.total_days || gig.total_days === 1) {
    return format(new Date(gig.date), 'PPP', { locale: sv })
  }

  const start = format(new Date(gig.start_date!), 'd MMM', { locale: sv })
  const end = format(new Date(gig.end_date!), 'd MMM yyyy', { locale: sv })
  return `${start} - ${end}`
}

const statusConfig = {
  tentative: { label: 'Ej bekräftat', icon: HelpCircle, color: 'bg-orange-100 text-orange-800' },
  pending: { label: 'Väntar på svar', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: 'Accepterat', icon: Check, color: 'bg-green-100 text-green-800' },
  declined: { label: 'Avböjt', icon: X, color: 'bg-red-100 text-red-800' },
  completed: { label: 'Genomfört', icon: Check, color: 'bg-blue-100 text-blue-800' },
  invoiced: { label: 'Fakturerat', icon: FileText, color: 'bg-purple-100 text-purple-800' },
  paid: { label: 'Betalt', icon: DollarSign, color: 'bg-emerald-100 text-emerald-800' },
}

export default function GigsPage() {
  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [selectedGigForInvoice, setSelectedGigForInvoice] = useState<Gig | null>(null)
  const [editingGig, setEditingGig] = useState<Gig | null>(null)
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesText, setNotesText] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadGigs()
  }, [])

  async function loadGigs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('gigs')
      .select(`
        *,
        client:clients(name, payment_terms),
        gig_type:gig_types(name, vat_rate, color),
        position:positions(name),
        gig_dates(date)
      `)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error loading gigs:', error)
    } else {
      setGigs(data || [])
    }
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from('gigs')
      .update({ status, response_date: status !== 'pending' ? new Date().toISOString() : null })
      .eq('id', id)

    if (error) {
      console.error('Error updating status:', error)
      alert('Kunde inte uppdatera status')
    } else {
      loadGigs()
    }
  }

  async function deleteGig(id: string) {
    if (!confirm('Är du säker på att du vill ta bort detta uppdrag?')) {
      return
    }

    const { error } = await supabase
      .from('gigs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting gig:', error)
      alert('Kunde inte ta bort uppdrag')
    } else {
      loadGigs()
    }
  }

  async function saveNotes(id: string, notes: string) {
    const { error } = await supabase
      .from('gigs')
      .update({ notes: notes || null })
      .eq('id', id)

    if (error) {
      console.error('Error saving notes:', error)
      alert('Kunde inte spara anteckningar')
    } else {
      // Update local state
      setGigs(gigs.map(g => g.id === id ? { ...g, notes: notes || null } : g))
      if (selectedGig?.id === id) {
        setSelectedGig({ ...selectedGig, notes: notes || null })
      }
      setEditingNotes(false)
    }
  }

  const filteredGigs = filter === 'all'
    ? gigs
    : gigs.filter(g => g.status === filter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Uppdrag</h1>
          <p className="text-muted-foreground">
            Hantera alla dina gigs och uppdrag
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nytt uppdrag
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Alla ({gigs.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
        >
          Väntar på svar ({gigs.filter(g => g.status === 'pending').length})
        </Button>
        <Button
          variant={filter === 'accepted' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('accepted')}
        >
          Accepterade ({gigs.filter(g => g.status === 'accepted').length})
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
        >
          Genomförda ({gigs.filter(g => g.status === 'completed').length})
        </Button>
        <Button
          variant={filter === 'declined' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('declined')}
        >
          Avböjda ({gigs.filter(g => g.status === 'declined').length})
        </Button>
      </div>

      {/* Statistics for declined gigs */}
      {filter === 'declined' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            <span className="font-semibold">Avböjda uppdrag:</span>{' '}
            {gigs.filter(g => g.status === 'declined').length} st,{' '}
            totalt {gigs
              .filter(g => g.status === 'declined')
              .reduce((sum, g) => sum + (g.fee || 0), 0)
              .toLocaleString('sv-SE')} kr
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {filter === 'all' ? 'Alla uppdrag' : statusConfig[filter as keyof typeof statusConfig]?.label || 'Uppdrag'} ({filteredGigs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Laddar...
            </div>
          ) : filteredGigs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Inga uppdrag än</p>
              <p className="text-sm">Klicka på "Nytt uppdrag" för att komma igång</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Uppdragsgivare</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Plats</TableHead>
                  <TableHead>Arvode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGigs.map((gig) => {
                  const StatusIcon = statusConfig[gig.status as keyof typeof statusConfig]?.icon
                  return (
                    <TableRow
                      key={gig.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedGig(gig)
                        setEditingNotes(false)
                      }}
                    >
                      <TableCell className="font-medium">
                        <div>
                          {formatGigDates(gig)}
                          {gig.total_days > 1 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({gig.total_days} dagar)
                            </span>
                          )}
                          {gig.project_name && (
                            <div className="text-sm text-muted-foreground truncate max-w-[250px]" title={gig.project_name}>
                              {gig.project_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {gig.client?.name || <span className="text-muted-foreground italic">Ej angiven</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: gig.gig_type.color || '#gray' }}
                          />
                          <span className="text-sm">{gig.gig_type.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {gig.gig_type.vat_rate}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {gig.venue || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {gig.fee !== null ? (
                          `${gig.fee.toLocaleString('sv-SE')} kr`
                        ) : (
                          <span className="text-muted-foreground italic">Ej angivet</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[gig.status as keyof typeof statusConfig]?.color}>
                          {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                          {statusConfig[gig.status as keyof typeof statusConfig]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {gig.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateStatus(gig.id, 'accepted')}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateStatus(gig.id, 'declined')}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          {gig.status === 'accepted' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateStatus(gig.id, 'completed')}
                            >
                              Markera genomfört
                            </Button>
                          )}
                          {gig.status === 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (!gig.client) {
                                  alert('Ange uppdragsgivare först innan du skapar faktura')
                                  setEditingGig(gig)
                                  return
                                }
                                if (gig.fee === null) {
                                  alert('Ange arvode först innan du skapar faktura')
                                  setEditingGig(gig)
                                  return
                                }
                                setSelectedGigForInvoice(gig)
                                setShowInvoiceDialog(true)
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Skapa faktura
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingGig(gig)}
                            title="Redigera uppdrag"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteGig(gig.id)}
                            title="Ta bort uppdrag"
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
          )}
        </CardContent>
      </Card>

      <CreateGigDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={loadGigs}
      />

      <CreateInvoiceDialog
        open={showInvoiceDialog}
        onOpenChange={(open) => {
          setShowInvoiceDialog(open)
          if (!open) setSelectedGigForInvoice(null)
        }}
        onSuccess={loadGigs}
        initialGig={selectedGigForInvoice && selectedGigForInvoice.client ? {
          id: selectedGigForInvoice.id,
          fee: selectedGigForInvoice.fee!, // Already validated as non-null before opening dialog
          travel_expense: selectedGigForInvoice.travel_expense,
          date: selectedGigForInvoice.date,
          start_date: selectedGigForInvoice.start_date,
          end_date: selectedGigForInvoice.end_date,
          total_days: selectedGigForInvoice.total_days,
          project_name: selectedGigForInvoice.project_name,
          client_id: selectedGigForInvoice.client_id!,
          client_name: selectedGigForInvoice.client.name,
          gig_type_name: selectedGigForInvoice.gig_type.name,
          gig_type_vat_rate: selectedGigForInvoice.gig_type.vat_rate,
          client_payment_terms: selectedGigForInvoice.client.payment_terms,
        } : undefined}
      />

      <EditGigDialog
        gig={editingGig}
        open={editingGig !== null}
        onOpenChange={(open) => !open && setEditingGig(null)}
        onSuccess={() => {
          loadGigs()
          // Update selectedGig if it was being edited
          if (editingGig && selectedGig?.id === editingGig.id) {
            setSelectedGig(null)
          }
        }}
      />

      {/* Detail Panel Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-500 ${
          selectedGig
            ? 'bg-black/40 backdrop-blur-sm opacity-100'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSelectedGig(null)}
      />

      {/* Detail Panel - Premium 2025 Design */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          selectedGig ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ height: '50vh', minHeight: '320px' }}
      >
        {/* Glass effect container */}
        <div className="h-full bg-gradient-to-b from-white/95 to-white/98 backdrop-blur-xl border-t border-white/20 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.2)]">
          {/* Decorative top bar */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-0">
            <div className="w-10 h-1 rounded-full bg-gray-300/80" />
          </div>

          {selectedGig && (
            <div className="h-full flex flex-col px-5">
              {/* Header */}
              <div className="flex items-start justify-between py-3">
                <div className="flex items-start gap-3">
                  {/* Color accent */}
                  <div
                    className="w-1 h-12 rounded-full mt-0.5"
                    style={{ backgroundColor: selectedGig.gig_type.color || '#6366f1' }}
                  />
                  <div className="space-y-0.5">
                    <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                      {selectedGig.project_name || selectedGig.gig_type.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedGig.client?.name || <span className="italic">Uppdragsgivare ej angiven</span>}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusConfig[selectedGig.status as keyof typeof statusConfig]?.color
                        }`}
                      >
                        {statusConfig[selectedGig.status as keyof typeof statusConfig]?.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {selectedGig.gig_type.name}
                        {selectedGig.position && ` • ${selectedGig.position.name}`}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-gray-100 -mt-1"
                  onClick={() => setSelectedGig(null)}
                >
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto pb-2">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Column 1 - Arvode & Datum */}
                  <div className="space-y-3">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-3 border border-emerald-100">
                      <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider mb-0.5">Arvode</p>
                      <p className="text-base font-bold text-emerald-700">
                        {selectedGig.fee !== null
                          ? `${selectedGig.fee.toLocaleString('sv-SE')} kr`
                          : '—'
                        }
                      </p>
                      {selectedGig.travel_expense && (
                        <p className="text-xs text-emerald-600 mt-1">
                          + {selectedGig.travel_expense.toLocaleString('sv-SE')} kr resa
                        </p>
                      )}
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-3 border border-gray-100">
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                        Datum ({selectedGig.gig_dates?.length || selectedGig.total_days} dagar)
                      </p>
                      {selectedGig.gig_dates && selectedGig.gig_dates.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {selectedGig.gig_dates
                            .sort((a, b) => a.date.localeCompare(b.date))
                            .map((gd, i) => {
                              const date = new Date(gd.date + 'T12:00:00')
                              const dayName = format(date, 'EEE', { locale: sv })
                              const dayNum = format(date, 'd', { locale: sv })
                              const month = format(date, 'MMM', { locale: sv })
                              return (
                                <div
                                  key={i}
                                  className="flex flex-col items-center bg-white rounded-lg px-2 py-1 border border-gray-200 shadow-sm min-w-[44px]"
                                >
                                  <span className="text-[8px] font-medium text-gray-400 uppercase">{dayName}</span>
                                  <span className="text-sm font-bold text-gray-900">{dayNum}</span>
                                  <span className="text-[8px] font-medium text-gray-500">{month}</span>
                                </div>
                              )
                            })}
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-gray-900">
                          {formatGigDates(selectedGig)}
                        </p>
                      )}
                    </div>
                    {selectedGig.venue && (
                      <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="p-1 bg-gray-100 rounded-md">
                            <MapPin className="h-3.5 w-3.5 text-gray-500" />
                          </div>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Plats</p>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{selectedGig.venue}</p>
                      </div>
                    )}
                  </div>

                  {/* Column 2 - Notes */}
                  <div>
                    <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm h-full">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Anteckningar</p>
                        {!editingNotes && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setNotesText(selectedGig.notes || '')
                              setEditingNotes(true)
                            }}
                          >
                            <Pencil className="h-3 w-3 text-gray-400" />
                          </Button>
                        )}
                      </div>
                      {editingNotes ? (
                        <div className="space-y-2">
                          <Textarea
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            className="text-sm min-h-[120px] resize-none"
                            placeholder="Skriv anteckningar här..."
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingNotes(false)}
                            >
                              Avbryt
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveNotes(selectedGig.id, notesText)}
                            >
                              Spara
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-snug">
                          {selectedGig.notes || <span className="text-gray-400 italic">Inga anteckningar</span>}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Column 3 - Attachments */}
                  <div>
                    <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm h-full">
                      <GigAttachments gigId={selectedGig.id} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with actions */}
              <div className="py-3 pb-5 border-t border-gray-100 flex items-center gap-2">
                <Button
                  className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg px-4 h-9 text-sm shadow-lg shadow-gray-900/10"
                  onClick={() => setEditingGig(selectedGig)}
                >
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Redigera
                </Button>
                {selectedGig.status === 'completed' && selectedGig.fee !== null && selectedGig.client && (
                  <Button
                    variant="outline"
                    className="rounded-lg px-4 h-9 text-sm border-gray-200 hover:bg-gray-50"
                    onClick={() => {
                      setSelectedGigForInvoice(selectedGig)
                      setShowInvoiceDialog(true)
                    }}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    Skapa faktura
                  </Button>
                )}
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg px-3 h-9 text-sm"
                  onClick={() => {
                    deleteGig(selectedGig.id)
                    setSelectedGig(null)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Ta bort
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
