'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { Shield, Award, TrendingUp, Settings, Music, Building2, ScrollText, Activity, CreditCard, Ticket, PenLine } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

import { SponsorsTab } from '@/components/admin/sponsors-tab'
import { CategoriesTab } from '@/components/admin/categories-tab'
import { StatsTab } from '@/components/admin/stats-tab'
import { ConfigTab } from '@/components/admin/config-tab'
import { OrganizationsTab } from '@/components/admin/organizations-tab'
import { AuditTab } from '@/components/admin/audit-tab'
import { SessionsTab } from '@/components/admin/sessions-tab'
import { StripeTab } from '@/components/admin/stripe-tab'
import { InvitationsTab } from '@/components/admin/invitations-tab'
import { ContractsTab } from '@/components/admin/contracts-tab'

type AdminTab = 'organizations' | 'sponsors' | 'categories' | 'stats' | 'stripe' | 'audit' | 'sessions' | 'invitations' | 'contracts' | 'config'

type User = {
  user_id: string
  plan: string
  status: string
  stripe_customer_id: string | null
  stripe_price_id: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  company_name: string | null
  org_number: string | null
  email: string | null
  address: string | null
  phone: string | null
  invoice_count: number
  client_count: number
  position_count: number
  gig_type_count: number
  expense_count: number
  monthly_invoices: number
  monthly_scans: number
  last_active?: string | null
  recent_activity_count?: number
}

type Sponsor = {
  id: string
  name: string
  logo_url: string | null
  tagline: string | null
  website_url: string | null
  instrument_category_id: string
  active: boolean
  priority: number
  category_name?: string
}

type Stats = {
  totalUsers: number
  proUsers: number
  freeUsers: number
  mrr: number
  arr: number
  monthlySubscribers: number
  yearlySubscribers: number
  adminSetPro: number
  totalImpressions: number
}

type InstrumentCategory = {
  id: string
  name: string
  slug?: string
  sort_order?: number
  instrument_count?: number
}

type ConfigEntry = {
  key: string
  value: string
}

export default function AdminPage() {
  const t = useTranslations('admin')

  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<AdminTab>('organizations')
  const router = useRouter()
  const supabase = createClient()

  // Data
  const [users, setUsers] = useState<User[]>([])
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [categories, setCategories] = useState<InstrumentCategory[]>([])
  const [stripeData, setStripeData] = useState<any>(null)

  // Config
  const [configValues, setConfigValues] = useState<Record<string, string>>({})
  const [savingConfig, setSavingConfig] = useState(false)

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/dashboard')
      return
    }

    const { data } = await supabase.rpc('is_admin', { uid: user.id })
    if (!data) {
      router.push('/dashboard')
      return
    }

    setIsAdmin(true)
    setLoading(false)
    loadData()
  }

  async function loadData() {
    // Categories
    const { data: cats } = await supabase
      .from('instrument_categories')
      .select('id, name, slug, sort_order, instruments(count)')
      .order('sort_order')
    if (cats) setCategories(cats.map((c: any) => ({
      ...c,
      instrument_count: c.instruments?.[0]?.count || 0,
    })))

    // Users
    const usersRes = await fetch('/api/admin/users')
    if (usersRes.ok) {
      const { users: userData } = await usersRes.json()
      setUsers(userData || [])
    }

    // Sponsors
    const { data: sponsorData } = await supabase
      .from('sponsors')
      .select('*, category:instrument_categories(name)')
      .order('priority', { ascending: false })
    if (sponsorData) {
      setSponsors(sponsorData.map((s: any) => ({
        ...s,
        category_name: s.category?.name,
      })))
    }

    // Stats
    const statsRes = await fetch('/api/admin/stats')
    if (statsRes.ok) {
      const statsData = await statsRes.json()
      setStats(statsData)
    }

    // Config
    const configRes = await fetch('/api/admin/config')
    if (configRes.ok) {
      const { config } = await configRes.json()
      if (config) {
        const map: Record<string, string> = {}
        config.forEach((c: ConfigEntry) => { map[c.key] = c.value })
        setConfigValues(map)
      }
    }

    // Stripe
    const stripeRes = await fetch('/api/admin/stripe')
    if (stripeRes.ok) {
      const stripeJson = await stripeRes.json()
      setStripeData(stripeJson)
    }
  }

  async function handleSaveConfig() {
    setSavingConfig(true)
    for (const [key, value] of Object.entries(configValues)) {
      await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
    }
    toast.success(t('savedConfig'))
    setSavingConfig(false)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!isAdmin) return null

  const tabs = [
    { key: 'organizations' as const, label: t('companies'), icon: Building2 },
    { key: 'sponsors' as const, label: t('sponsors'), icon: Award },
    { key: 'categories' as const, label: t('categories'), icon: Music },
    { key: 'stats' as const, label: t('statistics'), icon: TrendingUp },
    { key: 'stripe' as const, label: t('stripe'), icon: CreditCard },
    { key: 'audit' as const, label: t('audit'), icon: ScrollText },
    { key: 'sessions' as const, label: t('sessions'), icon: Activity },
    { key: 'invitations' as const, label: t('invitations'), icon: Ticket },
    { key: 'contracts' as const, label: 'Contracts', icon: PenLine },
    { key: 'config' as const, label: t('config'), icon: Settings },
  ]

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-red-600" />
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        {tabs.map(tabItem => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              tab === tabItem.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <tabItem.icon className="h-4 w-4" />
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'organizations' && (
        <OrganizationsTab
          users={users}
          setUsers={setUsers}
          onReload={() => loadData()}
        />
      )}
      {tab === 'sponsors' && (
        <SponsorsTab
          sponsors={sponsors}
          setSponsors={setSponsors}
          categories={categories}
          onReload={() => loadData()}
        />
      )}
      {tab === 'categories' && (
        <CategoriesTab
          categories={categories}
          setCategories={setCategories}
          onReload={() => loadData()}
        />
      )}
      {tab === 'stats' && (
        <StatsTab stats={stats} />
      )}
      {tab === 'stripe' && (
        <StripeTab data={stripeData} />
      )}
      {tab === 'audit' && (
        <AuditTab users={users} />
      )}
      {tab === 'sessions' && (
        <SessionsTab users={users} />
      )}
      {tab === 'invitations' && (
        <InvitationsTab />
      )}
      {tab === 'contracts' && (
        <ContractsTab />
      )}
      {tab === 'config' && (
        <ConfigTab
          configValues={configValues}
          setConfigValues={setConfigValues}
          savingConfig={savingConfig}
          onSave={handleSaveConfig}
        />
      )}
    </div>
  )
}
