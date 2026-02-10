'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { useDateLocale } from '@/lib/hooks/use-date-locale'
import { ChevronLeft, Check, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import Link from 'next/link'
import { useFormatLocale } from '@/lib/hooks/use-format-locale'

type Gig = {
  id: string
  date: string
  venue: string | null
  fee: number | null
  project_name: string | null
  status: string
  client: { name: string } | null
  gig_type: { name: string; color: string | null }
}

const statusColors: Record<string, string> = {
  tentative: 'bg-orange-100 text-orange-800',
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
  invoiced: 'bg-purple-100 text-purple-800',
  paid: 'bg-green-200 text-green-900',
}

export default function MobileGigList() {
  const t = useTranslations('mobile')
  const tGig = useTranslations('gig')
  const tStatus = useTranslations('status')
  const tc = useTranslations('common')
  const dateLocale = useDateLocale()
  const formatLocale = useFormatLocale()

  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'upcoming' | 'all'>('upcoming')
  const supabase = createClient()

  useEffect(() => {
    loadGigs()
  }, [filter])

  async function loadGigs() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    let query = supabase
      .from('gigs')
      .select('id, date, venue, fee, project_name, status, client:clients(name), gig_type:gig_types(name, color)')
      .order('date', { ascending: filter === 'upcoming' })

    if (filter === 'upcoming') {
      query = query.gte('date', today).in('status', ['accepted', 'pending', 'tentative'])
    }

    const { data } = await query.limit(50)
    setGigs((data as unknown as Gig[]) || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('gigs').update({ status }).eq('id', id)
    toast.success(status === 'accepted' ? t('accepted') : t('declined'))
    loadGigs()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/m">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">{t('assignments')}</h1>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            filter === 'upcoming'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {tGig('upcoming')}
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {t('all')}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : gigs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t('noGigsToShow')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {gigs.map(gig => (
            <div
              key={gig.id}
              className="p-4 rounded-xl bg-card border"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {gig.project_name || gig.gig_type.name}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {gig.client?.name || tGig('notSpecified')} • {format(new Date(gig.date), 'd MMM', { locale: dateLocale })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {gig.fee !== null && (
                    <span className="text-sm font-semibold">{gig.fee.toLocaleString(formatLocale)} {tc('kr')}</span>
                  )}
                  <Badge className={statusColors[gig.status] || ''}>
                    {tStatus(gig.status)}
                  </Badge>
                </div>
              </div>

              {/* Quick actions for pending gigs */}
              {(gig.status === 'pending' || gig.status === 'tentative') && (
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    className="flex-1 h-10 rounded-lg bg-green-600 hover:bg-green-700"
                    onClick={() => updateStatus(gig.id, 'accepted')}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {t('accept')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-10 rounded-lg text-red-600 border-red-200"
                    onClick={() => updateStatus(gig.id, 'declined')}
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t('decline')}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
