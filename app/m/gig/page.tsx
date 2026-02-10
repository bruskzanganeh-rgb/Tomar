'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronLeft, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

type Client = { id: string; name: string }
type GigType = { id: string; name: string; color: string | null }

export default function MobileNewGig() {
  const t = useTranslations('mobile')
  const tGig = useTranslations('gig')

  const [clients, setClients] = useState<Client[]>([])
  const [gigTypes, setGigTypes] = useState<GigType[]>([])
  const [loading, setLoading] = useState(false)

  const [date, setDate] = useState('')
  const [clientId, setClientId] = useState('')
  const [gigTypeId, setGigTypeId] = useState('')
  const [fee, setFee] = useState('')
  const [venue, setVenue] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadOptions() {
      const [{ data: c }, { data: g }] = await Promise.all([
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('gig_types').select('id, name, color').order('name'),
      ])
      setClients(c || [])
      setGigTypes(g || [])
      if (g && g.length > 0) setGigTypeId(g[0].id)
    }
    loadOptions()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !gigTypeId) {
      toast.error(t('selectDateAndType'))
      return
    }

    setLoading(true)

    const { data: gig, error } = await supabase
      .from('gigs')
      .insert({
        date,
        client_id: clientId || null,
        gig_type_id: gigTypeId,
        fee: fee ? parseFloat(fee) : null,
        venue: venue || null,
        status: clientId ? 'pending' : 'tentative',
        total_days: 1,
      })
      .select('id')
      .single()

    if (error) {
      toast.error(t('couldNotCreateGig'))
      setLoading(false)
      return
    }

    // Create gig_dates entry
    if (gig) {
      await supabase.from('gig_dates').insert({ gig_id: gig.id, date })
    }

    toast.success(t('gigCreated'))
    router.push('/m')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/m">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">{tGig('newGig')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Date */}
        <div className="space-y-2">
          <Label className="text-base">{tGig('date')}</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 text-base"
            required
          />
        </div>

        {/* Gig type - big buttons */}
        <div className="space-y-2">
          <Label className="text-base">{tGig('type')}</Label>
          <div className="flex flex-wrap gap-2">
            {gigTypes.map(gt => (
              <button
                key={gt.id}
                type="button"
                onClick={() => setGigTypeId(gt.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-all ${
                  gigTypeId === gt.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 text-gray-600 active:bg-gray-50'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: gt.color || '#6366f1' }}
                />
                {gt.name}
              </button>
            ))}
          </div>
        </div>

        {/* Client */}
        <div className="space-y-2">
          <Label className="text-base">{tGig('client')}</Label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full h-12 text-base rounded-lg border border-input bg-background px-3"
          >
            <option value="">{t('selectOptional')}</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Venue */}
        <div className="space-y-2">
          <Label className="text-base">{tGig('venue')}</Label>
          <Input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder={t('venuePlaceholder')}
            className="h-12 text-base"
          />
        </div>

        {/* Fee */}
        <div className="space-y-2">
          <Label className="text-base">{t('feeWithUnit')}</Label>
          <Input
            type="number"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="0"
            className="h-12 text-base"
          />
        </div>

        <Button type="submit" className="w-full h-14 text-base rounded-xl" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Check className="mr-2 h-5 w-5" />
          )}
          {t('createGig')}
        </Button>
      </form>
    </div>
  )
}
