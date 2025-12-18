"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart3, TrendingUp, XCircle, Calendar, Music, CalendarClock, Wallet, HelpCircle } from 'lucide-react'

type Gig = {
  id: string
  date: string
  fee: number | null
  total_days: number
  project_name: string | null
  status: string
  position_id: string | null
  client: { id: string; name: string } | null
  gig_type: { name: string }
  position: { id: string; name: string } | null
}

type Client = { id: string; name: string }
type Position = { id: string; name: string }

export default function AnalyticsPage() {
  const [gigs, setGigs] = useState<Gig[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [selectedPosition, setSelectedPosition] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    const [gigsResult, clientsResult, positionsResult] = await Promise.all([
      supabase
        .from('gigs')
        .select(`
          id,
          date,
          fee,
          total_days,
          project_name,
          status,
          position_id,
          client:clients(id, name),
          gig_type:gig_types(name),
          position:positions(id, name)
        `)
        .order('date', { ascending: false }),
      supabase
        .from('clients')
        .select('id, name')
        .order('name'),
      supabase
        .from('positions')
        .select('id, name')
        .order('sort_order')
    ])

    if (gigsResult.data) setGigs(gigsResult.data as unknown as Gig[])
    if (clientsResult.data) setClients(clientsResult.data)
    if (positionsResult.data) setPositions(positionsResult.data)
    setLoading(false)
  }

  // Get unique years from gigs
  const years = [...new Set(gigs.map(g => new Date(g.date).getFullYear()))].sort((a, b) => b - a)

  // Filter gigs based on selected year, client and position
  const filteredGigs = gigs.filter(g => {
    const yearMatch = selectedYear === 'all' || new Date(g.date).getFullYear().toString() === selectedYear
    const clientMatch = selectedClient === 'all' || g.client?.id === selectedClient
    const positionMatch = selectedPosition === 'all' || g.position_id === selectedPosition || (selectedPosition === 'none' && !g.position_id)
    return yearMatch && clientMatch && positionMatch
  })

  // Calculate statistics
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const completedGigs = filteredGigs.filter(g => ['completed', 'invoiced', 'paid'].includes(g.status))
  const declinedGigs = filteredGigs.filter(g => g.status === 'declined')

  // Kommande accepterade gigs (accepted status, datum >= idag)
  const upcomingGigs = filteredGigs.filter(g =>
    g.status === 'accepted' && new Date(g.date) >= today
  )

  // Ej bekräftade gigs (tentative status)
  const tentativeGigs = filteredGigs.filter(g =>
    g.status === 'tentative' && new Date(g.date) >= today
  )

  const totalRevenue = completedGigs.reduce((sum, g) => sum + (g.fee || 0), 0)
  const totalDays = completedGigs.reduce((sum, g) => sum + g.total_days, 0)
  const declinedAmount = declinedGigs.reduce((sum, g) => sum + (g.fee || 0), 0)
  const avgPerDay = totalDays > 0 ? totalRevenue / totalDays : 0

  // Kommande statistik
  const upcomingRevenue = upcomingGigs.reduce((sum, g) => sum + (g.fee || 0), 0)
  const upcomingDays = upcomingGigs.reduce((sum, g) => sum + g.total_days, 0)
  const nextGig = upcomingGigs.length > 0
    ? upcomingGigs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
    : null

  // Ej bekräftade statistik
  const tentativeRevenue = tentativeGigs.reduce((sum, g) => sum + (g.fee || 0), 0)
  const tentativeDays = tentativeGigs.reduce((sum, g) => sum + g.total_days, 0)

  // Calculate best paying gigs per day
  const gigsWithDayRate = completedGigs
    .filter(g => g.fee && g.total_days > 0)
    .map(g => ({
      ...g,
      dayRate: (g.fee || 0) / g.total_days
    }))
    .sort((a, b) => b.dayRate - a.dayRate)
    .slice(0, 10)

  // Calculate position statistics
  const positionStats = positions.map(position => {
    const positionGigs = completedGigs.filter(g => g.position_id === position.id)
    const totalFee = positionGigs.reduce((sum, g) => sum + (g.fee || 0), 0)
    const totalDaysForPosition = positionGigs.reduce((sum, g) => sum + g.total_days, 0)
    const avgPerDayForPosition = totalDaysForPosition > 0 ? totalFee / totalDaysForPosition : 0
    return {
      id: position.id,
      name: position.name,
      gigCount: positionGigs.length,
      totalDays: totalDaysForPosition,
      totalRevenue: totalFee,
      avgPerDay: avgPerDayForPosition
    }
  }).filter(p => p.gigCount > 0).sort((a, b) => b.totalRevenue - a.totalRevenue)

  // Add "no position" stats
  const noPositionGigs = completedGigs.filter(g => !g.position_id)
  const noPositionStats = {
    id: 'none',
    name: 'Ingen position',
    gigCount: noPositionGigs.length,
    totalDays: noPositionGigs.reduce((sum, g) => sum + g.total_days, 0),
    totalRevenue: noPositionGigs.reduce((sum, g) => sum + (g.fee || 0), 0),
    avgPerDay: noPositionGigs.reduce((sum, g) => sum + g.total_days, 0) > 0
      ? noPositionGigs.reduce((sum, g) => sum + (g.fee || 0), 0) / noPositionGigs.reduce((sum, g) => sum + g.total_days, 0)
      : 0
  }

  const allPositionStats = noPositionGigs.length > 0 ? [...positionStats, noPositionStats] : positionStats

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytik</h1>
        <p className="text-muted-foreground">
          Statistik och översikt över dina uppdrag
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-48">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger>
              <SelectValue placeholder="Välj år" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla år</SelectItem>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-64">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger>
              <SelectValue placeholder="Välj uppdragsgivare" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla uppdragsgivare</SelectItem>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {positions.length > 0 && (
          <div className="w-56">
            <Select value={selectedPosition} onValueChange={setSelectedPosition}>
              <SelectTrigger>
                <SelectValue placeholder="Välj position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla positioner</SelectItem>
                <SelectItem value="none">Ingen position</SelectItem>
                {positions.map(position => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Laddar...</div>
      ) : (
        <>
          {/* Kommande gigs */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">Kommande intäkter</CardTitle>
                <Wallet className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">
                  {upcomingRevenue.toLocaleString('sv-SE')} kr
                </div>
                <p className="text-xs text-blue-700">
                  {upcomingGigs.length} accepterade uppdrag
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">Kommande arbetsdagar</CardTitle>
                <CalendarClock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">{upcomingDays} dagar</div>
                <p className="text-xs text-blue-700">
                  {nextGig
                    ? `Nästa: ${new Date(nextGig.date).toLocaleDateString('sv-SE')}`
                    : 'Inga kommande gigs'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-900">Ej bekräftade</CardTitle>
                <HelpCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900">
                  {tentativeGigs.length} st
                </div>
                <p className="text-xs text-orange-700">
                  {tentativeRevenue > 0 ? `${tentativeRevenue.toLocaleString('sv-SE')} kr potentiellt` : `${tentativeDays} dagar potentiellt`}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Historik */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Genomförda intäkter</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalRevenue.toLocaleString('sv-SE')} kr
                </div>
                <p className="text-xs text-muted-foreground">
                  {completedGigs.length} genomförda uppdrag
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Genomförda dagar</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalDays} dagar</div>
                <p className="text-xs text-muted-foreground">
                  Totalt antal dagar
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avböjda</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{declinedGigs.length} st</div>
                <p className="text-xs text-muted-foreground">
                  {declinedAmount.toLocaleString('sv-SE')} kr totalt
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Snitt/dag</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(avgPerDay).toLocaleString('sv-SE')} kr
                </div>
                <p className="text-xs text-muted-foreground">
                  Genomsnitt per arbetsdag
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Best paying gigs per day */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Bäst betalda per dag
              </CardTitle>
            </CardHeader>
            <CardContent>
              {gigsWithDayRate.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Inga genomförda uppdrag med arvode
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projekt</TableHead>
                      <TableHead>Uppdragsgivare</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead className="text-right">Arvode</TableHead>
                      <TableHead className="text-right">Dagar</TableHead>
                      <TableHead className="text-right">Per dag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gigsWithDayRate.map((gig) => (
                      <TableRow key={gig.id}>
                        <TableCell className="font-medium">
                          {gig.project_name || new Date(gig.date).toLocaleDateString('sv-SE')}
                        </TableCell>
                        <TableCell>{gig.client?.name || <span className="text-muted-foreground italic">Ej angiven</span>}</TableCell>
                        <TableCell>{gig.gig_type.name}</TableCell>
                        <TableCell className="text-right">
                          {(gig.fee || 0).toLocaleString('sv-SE')} kr
                        </TableCell>
                        <TableCell className="text-right">{gig.total_days}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {Math.round(gig.dayRate).toLocaleString('sv-SE')} kr/dag
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Position statistics */}
          {allPositionStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Statistik per position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position</TableHead>
                      <TableHead className="text-right">Antal gigs</TableHead>
                      <TableHead className="text-right">Dagar</TableHead>
                      <TableHead className="text-right">Total intäkt</TableHead>
                      <TableHead className="text-right">Snitt/dag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPositionStats.map((stat) => (
                      <TableRow key={stat.id}>
                        <TableCell className="font-medium">{stat.name}</TableCell>
                        <TableCell className="text-right">{stat.gigCount}</TableCell>
                        <TableCell className="text-right">{stat.totalDays}</TableCell>
                        <TableCell className="text-right">
                          {stat.totalRevenue.toLocaleString('sv-SE')} kr
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {Math.round(stat.avgPerDay).toLocaleString('sv-SE')} kr/dag
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
