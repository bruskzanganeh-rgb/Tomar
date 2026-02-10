'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Activity, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFormatLocale } from '@/lib/hooks/use-format-locale'

type Session = {
  id: string
  user_id: string
  started_at: string
  last_active_at: string
  ended_at: string | null
  ip_address: string | null
  user_agent: string | null
  company_name: string | null
  email: string | null
}

type User = {
  user_id: string
  company_name: string | null
  email: string | null
}

type Props = {
  users: User[]
}

function formatDuration(startedAt: string, lastActiveAt: string): string {
  const ms = new Date(lastActiveAt).getTime() - new Date(startedAt).getTime()
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

function parseBrowser(ua: string | null): string {
  if (!ua) return '-'
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  return 'Other'
}

export function SessionsTab({ users }: Props) {
  const t = useTranslations('admin')
  const formatLocale = useFormatLocale()

  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessions, setActiveSessions] = useState<Session[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  // Filters
  const [filterUser, setFilterUser] = useState<string>('')
  const [filterFrom, setFilterFrom] = useState<string>('')
  const [filterTo, setFilterTo] = useState<string>('')

  useEffect(() => {
    loadSessions()
    loadActiveSessions()
  }, [page])

  async function loadActiveSessions() {
    const params = new URLSearchParams({ active_only: 'true' })
    const res = await fetch(`/api/admin/sessions?${params}`)
    if (res.ok) {
      const data = await res.json()
      setActiveSessions(data.sessions)
    }
  }

  async function loadSessions() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '50' })
    if (filterUser) params.set('user_id', filterUser)
    if (filterFrom) params.set('from', filterFrom)
    if (filterTo) params.set('to', filterTo)

    const res = await fetch(`/api/admin/sessions?${params}`)
    if (res.ok) {
      const data = await res.json()
      setSessions(data.sessions)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    }
    setLoading(false)
  }

  function handleFilter() {
    setPage(1)
    loadSessions()
  }

  function handleRefresh() {
    loadSessions()
    loadActiveSessions()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{t('sessions')}</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>

      {/* Active sessions */}
      {activeSessions.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              {t('activeSessions')} ({activeSessions.length})
            </p>
            <div className="space-y-1">
              {activeSessions.map(s => (
                <div key={s.id} className="flex items-center justify-between bg-secondary/50 rounded-md px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-[10px]">{t('activeNow')}</Badge>
                    <span className="text-sm">{s.company_name || s.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDuration(s.started_at, s.last_active_at)}</span>
                    <span>{parseBrowser(s.user_agent)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterUser || '__all__'} onValueChange={v => setFilterUser(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder={t('filterByUser')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('allUsers', { count: users.length })}</SelectItem>
            {users.map(u => (
              <SelectItem key={u.user_id} value={u.user_id}>
                {u.company_name || u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="w-36 h-8 text-xs" />
        <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="w-36 h-8 text-xs" />

        <Button size="sm" variant="secondary" onClick={handleFilter} className="h-8">
          {t('applyFilter')}
        </Button>
      </div>

      {/* Session history */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t('noSessions')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {sessions.map(s => {
            const isActive = !s.ended_at && (Date.now() - new Date(s.last_active_at).getTime()) < 5 * 60 * 1000
            return (
              <div key={s.id} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  {isActive && <span className="h-2 w-2 rounded-full bg-green-500" />}
                  <div>
                    <p className="text-sm">{s.company_name || s.email}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(s.started_at).toLocaleString(formatLocale)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{t('sessionDuration')}: {formatDuration(s.started_at, s.last_active_at)}</span>
                  {s.ip_address && <span>{s.ip_address}</span>}
                  <span>{parseBrowser(s.user_agent)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{total} {t('totalEntries')}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
