'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Music, Building2, Guitar, Users, ChevronRight, ChevronLeft, Check, Plus, X, Loader2, Sparkles, Globe, MapPin } from 'lucide-react'
import { useLocale } from 'next-intl'
import { toast } from 'sonner'
import { COUNTRY_CONFIGS, getCountryConfig } from '@/lib/country-config'

type InstrumentCategory = {
  id: string
  name: string
  slug: string
  sort_order: number
  instruments: { id: string; name: string; sort_order: number }[]
}

type GigType = {
  id: string
  name: string
  vat_rate: number
  color: string
}

type Position = {
  id: string
  name: string
  sort_order: number
}

function getGigTypePresets(locale: string, countryCode: string): { name: string; name_en: string; vat_rate: number; color: string }[] {
  const config = getCountryConfig(countryCode)
  const vat = config.defaultVatRates
  if (locale === 'sv') {
    return [
      { name: 'Konsert', name_en: 'Concert', vat_rate: vat.concert, color: '#3b82f6' },
      { name: 'Inspelning', name_en: 'Recording', vat_rate: vat.recording, color: '#8b5cf6' },
      { name: 'Undervisning', name_en: 'Teaching', vat_rate: vat.teaching, color: '#10b981' },
      { name: 'Utgifter', name_en: 'Expenses', vat_rate: vat.expenses, color: '#6b7280' },
    ]
  }
  return [
    { name: 'Concert', name_en: 'Concert', vat_rate: vat.concert, color: '#3b82f6' },
    { name: 'Recording', name_en: 'Recording', vat_rate: vat.recording, color: '#8b5cf6' },
    { name: 'Teaching', name_en: 'Teaching', vat_rate: vat.teaching, color: '#10b981' },
    { name: 'Expenses', name_en: 'Expenses', vat_rate: vat.expenses, color: '#6b7280' },
  ]
}

const POSITION_PRESETS: Record<string, string[]> = {
  sv: ['1:a konsertmästare', 'Stämledare', 'Tutti'],
  en: ['1st concertmaster', 'Section leader', 'Tutti'],
}

export default function OnboardingPage() {
  const t = useTranslations('onboarding')
  const tc = useTranslations('common')
  const tSettings = useTranslations('settings')
  const tToast = useTranslations('toast')
  const locale = useLocale()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const STEPS = [
    { label: t('language'), icon: Globe },
    { label: t('country'), icon: MapPin },
    { label: t('companyInfo'), icon: Building2 },
    { label: t('instruments'), icon: Guitar },
    { label: t('gigTypes'), icon: Music },
    { label: t('roles'), icon: Users },
  ]

  // Step 1: Country
  const [countryCode, setCountryCode] = useState('SE')
  const countryConfig = getCountryConfig(countryCode)

  // Step 2: Company info
  const [companyName, setCompanyName] = useState('')
  const [orgNumber, setOrgNumber] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [bankAccount, setBankAccount] = useState('')

  // Step 2: Instruments
  const [categories, setCategories] = useState<InstrumentCategory[]>([])
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([])

  // Step 3: Gig types
  const [gigTypes, setGigTypes] = useState<GigType[]>([])
  const [newGigTypeName, setNewGigTypeName] = useState('')
  const [newGigTypeVat, setNewGigTypeVat] = useState('')

  // Step 4: Positions
  const [positions, setPositions] = useState<Position[]>([])
  const [newPositionName, setNewPositionName] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    // Load company settings (pre-filled from signup)
    const { data: settings } = await supabase
      .from('company_settings')
      .select('company_name, org_number, address, email, phone, bank_account, country_code')
      .single()

    if (settings) {
      setCompanyName(settings.company_name || '')
      setOrgNumber(settings.org_number || '')
      setAddress(settings.address || '')
      setEmail(settings.email || '')
      setPhone(settings.phone || '')
      setBankAccount(settings.bank_account || '')
      if (settings.country_code) setCountryCode(settings.country_code)
    }

    // Load instrument categories + instruments
    const { data: cats } = await supabase
      .from('instrument_categories')
      .select('id, name, slug, sort_order')
      .order('sort_order')

    if (cats) {
      const categoriesWithInstruments: InstrumentCategory[] = []
      for (const cat of cats) {
        const { data: instruments } = await supabase
          .from('instruments')
          .select('id, name, sort_order')
          .eq('category_id', cat.id)
          .order('sort_order')

        categoriesWithInstruments.push({
          ...cat,
          instruments: instruments || [],
        })
      }
      setCategories(categoriesWithInstruments)
    }

    // Load existing gig types
    const { data: types } = await supabase
      .from('gig_types')
      .select('id, name, vat_rate, color')
      .order('name')

    if (types) setGigTypes(types)

    // Load existing positions
    const { data: pos } = await supabase
      .from('positions')
      .select('id, name, sort_order')
      .order('sort_order')

    if (pos) setPositions(pos)
  }

  function toggleInstrument(instrumentId: string) {
    setSelectedInstruments(prev =>
      prev.includes(instrumentId)
        ? prev.filter(id => id !== instrumentId)
        : [...prev, instrumentId]
    )
  }

  async function addGigType() {
    if (!newGigTypeName.trim()) return
    const { data, error } = await supabase
      .from('gig_types')
      .insert({ name: newGigTypeName.trim(), vat_rate: parseFloat(newGigTypeVat) || 0, color: '#6b7280' })
      .select()
      .single()

    if (data) {
      setGigTypes(prev => [...prev, data])
      setNewGigTypeName('')
      setNewGigTypeVat('')
    }
    if (error) toast.error(tToast('onboardingGigTypeError'))
  }

  async function removeGigType(id: string) {
    await supabase.from('gig_types').delete().eq('id', id)
    setGigTypes(prev => prev.filter(t => t.id !== id))
  }

  async function addPosition() {
    if (!newPositionName.trim()) return
    const sortOrder = positions.length + 1
    const { data, error } = await supabase
      .from('positions')
      .insert({ name: newPositionName.trim(), sort_order: sortOrder })
      .select()
      .single()

    if (data) {
      setPositions(prev => [...prev, data])
      setNewPositionName('')
    }
    if (error) toast.error(tToast('onboardingPositionError'))
  }

  async function removePosition(id: string) {
    await supabase.from('positions').delete().eq('id', id)
    setPositions(prev => prev.filter(p => p.id !== id))
  }

  async function quickAddGigType(preset: { name: string; name_en: string; vat_rate: number; color: string }) {
    const { data, error } = await supabase
      .from('gig_types')
      .insert({ name: preset.name, name_en: preset.name_en, vat_rate: preset.vat_rate, color: preset.color })
      .select()
      .single()
    if (data) setGigTypes(prev => [...prev, data])
  }

  async function quickAddPosition(name: string) {
    const sortOrder = positions.length + 1
    const { data, error } = await supabase
      .from('positions')
      .insert({ name, sort_order: sortOrder })
      .select()
      .single()
    if (data) setPositions(prev => [...prev, data])
  }

  const gigTypePresets = getGigTypePresets(locale, countryCode)
    .filter(p => !gigTypes.some(gt => gt.name.toLowerCase() === p.name.toLowerCase()))

  const positionPresets = (POSITION_PRESETS[locale] || POSITION_PRESETS.en)
    .filter(p => !positions.some(pos => pos.name.toLowerCase() === p.toLowerCase()))

  async function handleComplete() {
    setSaving(true)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_info: {
            company_name: companyName,
            org_number: orgNumber,
            address,
            email,
            phone,
            bank_account: bankAccount,
            country_code: countryCode,
            base_currency: countryConfig.currency,
          },
          instruments: selectedInstruments,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || tToast('onboardingSaveError'))
      }

      toast.success(tToast('onboardingComplete'))
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || tToast('onboardingCompleteError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Music className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{t('welcome')}</h1>
          <p className="text-muted-foreground mt-1">{t('setupDescription')}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    i === step
                      ? 'bg-primary text-primary-foreground'
                      : i < step
                        ? 'bg-primary/20 text-primary cursor-pointer'
                        : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {i < step ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            )
          })}
        </div>

        {/* Step 0: Language */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t('language')}
              </CardTitle>
              <CardDescription>
                {t('languageDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: 'sv', label: 'Svenska', flag: '🇸🇪' },
                  { value: 'en', label: 'English', flag: '🇬🇧' },
                ].map(lang => (
                  <button
                    key={lang.value}
                    onClick={() => {
                      if (lang.value !== locale) {
                        document.cookie = `NEXT_LOCALE=${lang.value};path=/;max-age=${60 * 60 * 24 * 365}`
                        window.location.reload()
                      }
                    }}
                    className={`flex flex-col items-center gap-2 p-6 rounded-lg border-2 text-lg font-medium transition-colors ${
                      locale === lang.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50 hover:bg-muted'
                    }`}
                  >
                    <span className="text-3xl">{lang.flag}</span>
                    {lang.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Country */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t('country')}
              </CardTitle>
              <CardDescription>
                {t('countryDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(COUNTRY_CONFIGS).map(([code, config]) => (
                  <button
                    key={code}
                    onClick={() => setCountryCode(code)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                      countryCode === code
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50 hover:bg-muted'
                    }`}
                  >
                    <span className="text-lg">{config.flag}</span>
                    {locale === 'sv' ? config.name.sv : config.name.en}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Company Info */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('companyInfo')}
              </CardTitle>
              <CardDescription>
                {t('companyInfoDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">{tSettings('companyName')}</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgNumber">{locale === 'sv' ? countryConfig.orgLabel.sv : countryConfig.orgLabel.en}</Label>
                  <Input
                    id="orgNumber"
                    value={orgNumber}
                    onChange={e => setOrgNumber(e.target.value)}
                    placeholder={countryConfig.orgPlaceholder}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{tSettings('address')}</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{tSettings('email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{tSettings('phone')}</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccount">{tSettings('bankAccount')}</Label>
                <Input
                  id="bankAccount"
                  value={bankAccount}
                  onChange={e => setBankAccount(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Instruments */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Guitar className="h-5 w-5" />
                {t('yourInstruments')}
              </CardTitle>
              <CardDescription>
                {t('selectInstruments')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {categories.map(cat => (
                  <div key={cat.id}>
                    <h3 className="text-sm font-semibold mb-2">{cat.name}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {cat.instruments.map(inst => {
                        const selected = selectedInstruments.includes(inst.id)
                        return (
                          <button
                            key={inst.id}
                            onClick={() => toggleInstrument(inst.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                              selected
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border hover:bg-secondary'
                            }`}
                          >
                            <Checkbox checked={selected} className="pointer-events-none" />
                            {inst.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {selectedInstruments.length > 0 && (
                <p className="text-xs text-muted-foreground mt-4">
                  {t('instrumentsSelected', { count: selectedInstruments.length })}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Gig Types */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                {t('gigTypes')}
              </CardTitle>
              <CardDescription>
                {t('gigTypesDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                {gigTypes.map(type => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: type.color }}
                      />
                      <span className="text-sm font-medium">{type.name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {type.vat_rate}% {t('vat')}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGigType(type.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              {gigTypePresets.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                    <Sparkles className="h-3 w-3" />
                    {t('quickAdd')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {gigTypePresets.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => quickAddGigType(preset)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-muted-foreground/30 text-xs text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.color }} />
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newGigTypeName}
                  onChange={e => setNewGigTypeName(e.target.value)}
                  placeholder={t('newGigTypePlaceholder')}
                  onKeyDown={e => e.key === 'Enter' && addGigType()}
                  className="flex-1"
                />
                <div className="relative w-20">
                  <Input
                    type="number"
                    value={newGigTypeVat}
                    onChange={e => setNewGigTypeVat(e.target.value)}
                    placeholder={t('vat')}
                    onKeyDown={e => e.key === 'Enter' && addGigType()}
                    className="pr-6"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <Button onClick={addGigType} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  {tc('add')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Positions */}
        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('rolesPositions')}
              </CardTitle>
              <CardDescription>
                {t('rolesDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                {positions.map(pos => (
                  <div
                    key={pos.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50"
                  >
                    <span className="text-sm font-medium">{pos.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePosition(pos.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              {positionPresets.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                    <Sparkles className="h-3 w-3" />
                    {t('quickAdd')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {positionPresets.map((name) => (
                      <button
                        key={name}
                        onClick={() => quickAddPosition(name)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-muted-foreground/30 text-xs text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Plus className="h-2.5 w-2.5" />
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newPositionName}
                  onChange={e => setNewPositionName(e.target.value)}
                  placeholder={t('newRolePlaceholder')}
                  onKeyDown={e => e.key === 'Enter' && addPosition()}
                />
                <Button onClick={addPosition} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  {tc('add')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {tc('back')}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)}>
              {tc('next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('finish')}
              <Check className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
