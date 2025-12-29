"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Music, Search, Download, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { toast } from 'sonner'

type RepertoireItem = {
  work_id: string
  work_title: string
  work_composer: string
  work_catalog_number: string | null
  conductor: string | null
  gig_date: string
  client_name: string | null
  gig_id: string
}

type ComposerStats = {
  composer: string
  workCount: number
  performanceCount: number
}

export default function RepertoirePage() {
  const [items, setItems] = useState<RepertoireItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedComposer, setSelectedComposer] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')

  const supabase = createClient()

  useEffect(() => {
    loadRepertoire()
  }, [])

  async function loadRepertoire() {
    setLoading(true)

    const { data, error } = await supabase
      .from('gig_works')
      .select(`
        work_id,
        work:works(title, composer, catalog_number),
        gig:gigs(id, date, conductor, client:clients(name))
      `)
      .order('work_id')

    if (error) {
      console.error('Error loading repertoire:', error)
      setLoading(false)
      return
    }

    // Transformera data
    const transformed: RepertoireItem[] = (data || []).map((item: any) => ({
      work_id: item.work_id,
      work_title: item.work?.title || '',
      work_composer: item.work?.composer || '',
      work_catalog_number: item.work?.catalog_number,
      conductor: item.gig?.conductor || null,
      gig_date: item.gig?.date || '',
      client_name: item.gig?.client?.name || null,
      gig_id: item.gig?.id || '',
    }))

    setItems(transformed)
    setLoading(false)
  }

  // Extrahera unika kompositörer och år
  const composers = [...new Set(items.map(i => i.work_composer))].sort()
  const years = [...new Set(items.map(i => new Date(i.gig_date).getFullYear()))].sort((a, b) => b - a)

  // Filtrera items
  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery === '' ||
      item.work_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.work_composer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.conductor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.client_name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesComposer = selectedComposer === 'all' ||
      item.work_composer === selectedComposer

    const matchesYear = selectedYear === 'all' ||
      new Date(item.gig_date).getFullYear().toString() === selectedYear

    return matchesSearch && matchesComposer && matchesYear
  })

  // Gruppera per verk för sammanfattning
  const worksSummary = filteredItems.reduce((acc, item) => {
    const key = `${item.work_composer}|${item.work_title}`
    if (!acc[key]) {
      acc[key] = {
        composer: item.work_composer,
        title: item.work_title,
        catalog_number: item.work_catalog_number,
        performances: [],
      }
    }
    acc[key].performances.push({
      date: item.gig_date,
      conductor: item.conductor,
      client: item.client_name,
    })
    return acc
  }, {} as Record<string, { composer: string; title: string; catalog_number: string | null; performances: { date: string; conductor: string | null; client: string | null }[] }>)

  const uniqueWorks = Object.values(worksSummary).sort((a, b) =>
    a.composer.localeCompare(b.composer) || a.title.localeCompare(b.title)
  )

  // Beräkna statistik per kompositör
  const composerStats: ComposerStats[] = composers.map(composer => {
    const composerWorks = filteredItems.filter(i => i.work_composer === composer)
    const uniqueWorkIds = new Set(composerWorks.map(i => i.work_id))
    return {
      composer,
      workCount: uniqueWorkIds.size,
      performanceCount: composerWorks.length,
    }
  }).sort((a, b) => b.performanceCount - a.performanceCount)

  // Exportera till text för CV
  function exportToCV() {
    let text = "REPERTOAR\n\n"

    // Gruppera per kompositör
    const byComposer = uniqueWorks.reduce((acc, work) => {
      if (!acc[work.composer]) {
        acc[work.composer] = []
      }
      acc[work.composer].push(work)
      return acc
    }, {} as Record<string, typeof uniqueWorks>)

    Object.keys(byComposer).sort().forEach(composer => {
      text += `${composer}\n`
      byComposer[composer].forEach(work => {
        text += `  - ${work.title}`
        if (work.catalog_number) {
          text += ` (${work.catalog_number})`
        }
        text += '\n'
      })
      text += '\n'
    })

    // Kopiera till clipboard
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Repertoar kopierad till urklipp!')
    }).catch(() => {
      // Fallback: öppna i nytt fönster
      const blob = new Blob([text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      window.open(url)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Repertoar</h1>
          <p className="text-muted-foreground">
            Alla verk du spelat
          </p>
        </div>
        <Button onClick={exportToCV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportera till CV
        </Button>
      </div>

      {/* Statistik */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unika verk</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueWorks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kompositörer</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{composers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Framföranden</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredItems.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök verk, kompositör, dirigent..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <Select value={selectedComposer} onValueChange={setSelectedComposer}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Kompositör" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla kompositörer</SelectItem>
            {composers.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="År" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla år</SelectItem>
            {years.map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Verk-lista */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Verk ({uniqueWorks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Laddar...</p>
          ) : uniqueWorks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Inga verk registrerade än</p>
              <p className="text-sm">Lägg till verk via "Redigera uppdrag"</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kompositör</TableHead>
                  <TableHead>Verk</TableHead>
                  <TableHead>Dirigent(er)</TableHead>
                  <TableHead>Orkester</TableHead>
                  <TableHead className="text-right">Spelat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uniqueWorks.map((work) => {
                  const conductors = [...new Set(work.performances.map(p => p.conductor).filter(Boolean))]
                  const clients = [...new Set(work.performances.map(p => p.client).filter(Boolean))]
                  return (
                    <TableRow key={`${work.composer}-${work.title}`}>
                      <TableCell className="font-medium">{work.composer}</TableCell>
                      <TableCell>
                        {work.title}
                        {work.catalog_number && (
                          <span className="text-muted-foreground ml-1">
                            ({work.catalog_number})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {conductors.length > 0 ? conductors.join(', ') : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {clients.length > 0 ? clients.slice(0, 2).join(', ') : '-'}
                        {clients.length > 2 && ` +${clients.length - 2}`}
                      </TableCell>
                      <TableCell className="text-right">
                        {work.performances.length}x
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Top kompositörer */}
      {composerStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Kompositörer (mest spelade)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {composerStats.slice(0, 9).map((stat) => (
                <div
                  key={stat.composer}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <span className="font-medium truncate">{stat.composer}</span>
                  <span className="text-sm text-muted-foreground">
                    {stat.workCount} verk, {stat.performanceCount}x
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
