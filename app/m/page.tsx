'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { useDateLocale } from '@/lib/hooks/use-date-locale'
import { Calendar, Clock, DollarSign, Plus, Camera } from 'lucide-react'
import Link from 'next/link'
import { useFormatLocale } from '@/lib/hooks/use-format-locale'

type UpcomingGig = {
  id: string
  date: string
  venue: string | null
  fee: number | null
  project_name: string | null
  status: string
  client: { name: string } | null
  gig_type: { name: string; color: string | null }
}

export default function MobileHome() {
  const t = useTranslations('mobile')
  const tGig = useTranslations('gig')
  const tc = useTranslations('common')
  const dateLocale = useDateLocale()
  const formatLocale = useFormatLocale()

  const [nextGigs, setNextGigs] = useState<UpcomingGig[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('gigs')
        .select('id, date, venue, fee, project_name, status, client:clients(name), gig_type:gig_types(name, color)')
        .gte('date', today)
        .in('status', ['accepted', 'pending', 'tentative'])
        .order('date', { ascending: true })
        .limit(5)

      setNextGigs((data as unknown as UpcomingGig[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold">Babalisk</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE d MMMM', { locale: dateLocale })}
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/m/gig"
          className="flex items-center gap-3 p-4 rounded-2xl bg-primary text-primary-foreground active:scale-[0.98] transition-transform"
        >
          <Plus className="h-6 w-6" />
          <div>
            <p className="font-semibold">{tGig('newGig')}</p>
            <p className="text-xs opacity-80">{t('addGig')}</p>
          </div>
        </Link>
        <Link
          href="/m/receipt"
          className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-600 text-white active:scale-[0.98] transition-transform"
        >
          <Camera className="h-6 w-6" />
          <div>
            <p className="font-semibold">{tGig('receipts')}</p>
            <p className="text-xs opacity-80">{t('photoAndSave')}</p>
          </div>
        </Link>
      </div>

      {/* Next gigs */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {tGig('upcoming')}
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : nextGigs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{tGig('noUpcoming')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {nextGigs.map(gig => (
              <div
                key={gig.id}
                className="flex items-center gap-3 p-4 rounded-xl bg-card border active:bg-muted/50 transition-colors"
              >
                <div
                  className="w-1 h-12 rounded-full shrink-0"
                  style={{ backgroundColor: gig.gig_type.color || '#6366f1' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {gig.project_name || gig.gig_type.name}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {gig.client?.name || tGig('notSpecified')}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(gig.date), 'd MMM', { locale: dateLocale })}
                    </span>
                    {gig.venue && (
                      <span className="text-xs text-muted-foreground truncate">
                        {gig.venue}
                      </span>
                    )}
                  </div>
                </div>
                {gig.fee !== null && (
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">
                      {gig.fee.toLocaleString(formatLocale)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{tc('kr')}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
