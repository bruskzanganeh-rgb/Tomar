'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Settings, Building2, CreditCard, Image, Loader2, Upload, Trash2, Calendar, Copy, Check, Cpu, Mail, Send, Crown, Globe } from 'lucide-react'
import { SubscriptionSettings } from '@/components/settings/subscription-settings'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

type CompanySettings = {
  id: string
  company_name: string
  org_number: string
  address: string
  email: string
  phone: string
  bank_account: string
  logo_url: string | null
  vat_registration_number: string | null
  late_payment_interest_text: string | null
  show_logo_on_invoice: boolean
  our_reference: string | null
  smtp_host: string | null
  smtp_port: number | null
  smtp_user: string | null
  smtp_password: string | null
  smtp_from_email: string | null
  smtp_from_name: string | null
  base_currency: string
  locale: string
}

type AiUsageData = {
  period: string
  totalCalls: number
  totalCostUsd: number
  breakdown: {
    [key: string]: {
      calls: number
      cost: number
      label: string
    }
  }
  dailyTotals: Array<{ date: string; cost: number; calls: number }>
}

export default function SettingsPage() {
  const t = useTranslations('settings')
  const tToast = useTranslations('toast')
  const tc = useTranslations('common')

  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [calendarCopied, setCalendarCopied] = useState(false)
  const [aiUsage, setAiUsage] = useState<AiUsageData | null>(null)
  const [aiUsagePeriod, setAiUsagePeriod] = useState('30d')
  const [aiUsageLoading, setAiUsageLoading] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Generate calendar URL
  const calendarUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/calendar/feed`
    : ''
  const webcalUrl = calendarUrl.replace('http://', 'webcal://').replace('https://', 'webcal://')

  async function copyCalendarUrl() {
    try {
      await navigator.clipboard.writeText(calendarUrl)
      setCalendarCopied(true)
      setTimeout(() => setCalendarCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    loadAiUsage()
  }, [aiUsagePeriod])

  async function loadAiUsage() {
    setAiUsageLoading(true)
    try {
      const response = await fetch(`/api/settings/ai-usage?period=${aiUsagePeriod}`)
      if (response.ok) {
        const data = await response.json()
        setAiUsage(data)
      }
    } catch (error) {
      console.error('Failed to load AI usage:', error)
    }
    setAiUsageLoading(false)
  }

  async function loadSettings() {
    setLoading(true)
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .single()

    if (error) {
      console.error('Error loading settings:', error)
    } else {
      setSettings(data)
      setLogoPreview(data?.logo_url || null)
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!settings) return

    setSaving(true)
    const { error } = await supabase
      .from('company_settings')
      .update({
        company_name: settings.company_name,
        org_number: settings.org_number,
        address: settings.address,
        email: settings.email,
        phone: settings.phone,
        bank_account: settings.bank_account,
        logo_url: logoPreview,
        vat_registration_number: settings.vat_registration_number,
        late_payment_interest_text: settings.late_payment_interest_text,
        show_logo_on_invoice: settings.show_logo_on_invoice,
        our_reference: settings.our_reference,
        smtp_host: settings.smtp_host,
        smtp_port: settings.smtp_port,
        smtp_user: settings.smtp_user,
        smtp_password: settings.smtp_password,
        smtp_from_email: settings.smtp_from_email,
        smtp_from_name: settings.smtp_from_name,
        base_currency: settings.base_currency,
        locale: settings.locale,
      })
      .eq('id', settings.id)

    setSaving(false)

    if (error) {
      console.error('Error saving settings:', error)
      toast.error(tToast('settingsError', { error: error.message }))
    } else {
      toast.success(tToast('settingsSaved'))
    }
  }

  async function handleTestEmail() {
    if (!settings?.smtp_host || !settings?.smtp_from_email) {
      toast.error(t('fillSmtpFirst'))
      return
    }

    setTestingEmail(true)
    try {
      const response = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp_host: settings.smtp_host,
          smtp_port: settings.smtp_port || 587,
          smtp_user: settings.smtp_user,
          smtp_password: settings.smtp_password,
          smtp_from_email: settings.smtp_from_email,
          smtp_from_name: settings.smtp_from_name || settings.company_name,
          to_email: settings.email, // Send to company email
        }),
      })

      const result = await response.json()
      if (response.ok) {
        toast.success(tToast('testEmailSent', { email: settings.email }))
      } else {
        toast.error(tToast('testEmailError', { error: result.error || 'Unknown error' }))
      }
    } catch (error) {
      toast.error(tToast('testEmailGenericError'))
    }
    setTestingEmail(false)
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 500KB)
    if (file.size > 500 * 1024) {
      toast.error(tToast('logoTooLarge'))
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error(tToast('onlyImages'))
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function handleRemoveLogo() {
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{tc('loading')}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8" />
          {t('title')}
        </h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Info */}
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
            <div className="space-y-2">
              <Label htmlFor="company_name">{t('companyName')}</Label>
              <Input
                id="company_name"
                value={settings?.company_name || ''}
                onChange={(e) =>
                  setSettings(s => s ? { ...s, company_name: e.target.value } : null)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org_number">{t('orgNumber')}</Label>
              <Input
                id="org_number"
                value={settings?.org_number || ''}
                onChange={(e) =>
                  setSettings(s => s ? { ...s, org_number: e.target.value } : null)
                }
                placeholder="XXXXXX-XXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t('address')}</Label>
              <Textarea
                id="address"
                rows={3}
                value={settings?.address || ''}
                onChange={(e) =>
                  setSettings(s => s ? { ...s, address: e.target.value } : null)
                }
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings?.email || ''}
                  onChange={(e) =>
                    setSettings(s => s ? { ...s, email: e.target.value } : null)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input
                  id="phone"
                  value={settings?.phone || ''}
                  onChange={(e) =>
                    setSettings(s => s ? { ...s, phone: e.target.value } : null)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="our_reference">{t('ourReference')}</Label>
              <Input
                id="our_reference"
                value={settings?.our_reference || ''}
                onChange={(e) =>
                  setSettings(s => s ? { ...s, our_reference: e.target.value } : null)
                }
                placeholder={t('referenceExample')}
              />
              <p className="text-xs text-muted-foreground">
                {t('ourReferenceHint')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bank & Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t('paymentInfo')}
            </CardTitle>
            <CardDescription>
              {t('paymentInfoDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank_account">{t('bankAccount')}</Label>
              <Input
                id="bank_account"
                value={settings?.bank_account || ''}
                onChange={(e) =>
                  setSettings(s => s ? { ...s, bank_account: e.target.value } : null)
                }
                placeholder="XXXX-XXXX"
              />
              <p className="text-xs text-muted-foreground">
                {t('bankAccountHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vat_registration_number">{t('vatRegNumber')}</Label>
              <Input
                id="vat_registration_number"
                value={settings?.vat_registration_number || ''}
                onChange={(e) =>
                  setSettings(s => s ? { ...s, vat_registration_number: e.target.value } : null)
                }
                placeholder="SE559087745101"
              />
              <p className="text-xs text-muted-foreground">
                {t('vatRegNumberHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="late_payment_interest_text">{t('latePaymentInterest')}</Label>
              <Textarea
                id="late_payment_interest_text"
                rows={2}
                value={settings?.late_payment_interest_text || ''}
                onChange={(e) =>
                  setSettings(s => s ? { ...s, late_payment_interest_text: e.target.value } : null)
                }
                placeholder={t('latePaymentExample')}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {t('latePaymentInterestHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_currency">{t('baseCurrency')}</Label>
              <Select
                value={settings?.base_currency || 'SEK'}
                onValueChange={(value) =>
                  setSettings(s => s ? { ...s, base_currency: value } : null)
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEK">SEK — Svenska kronor</SelectItem>
                  <SelectItem value="NOK">NOK — Norska kronor</SelectItem>
                  <SelectItem value="DKK">DKK — Danska kronor</SelectItem>
                  <SelectItem value="EUR">EUR — Euro</SelectItem>
                  <SelectItem value="USD">USD — US Dollar</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('baseCurrencyHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locale">{t('language')}</Label>
              <Select
                value={settings?.locale || 'sv'}
                onValueChange={async (value) => {
                  setSettings(s => s ? { ...s, locale: value } : null)
                  // Save locale to DB immediately
                  if (settings?.id) {
                    await supabase
                      .from('company_settings')
                      .update({ locale: value })
                      .eq('id', settings.id)
                  }
                  // Set cookie and reload for the new locale to take effect
                  document.cookie = `NEXT_LOCALE=${value};path=/;max-age=${60 * 60 * 24 * 365}`
                  window.location.reload()
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <Globe className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sv">Svenska</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('languageHint')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              {t('logo')}
            </CardTitle>
            <CardDescription>
              {t('logoDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              {/* Preview */}
              <div className="w-48 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt={t('logo')}
                    className="max-w-full max-h-full object-contain p-2"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">{t('noLogo')}</p>
                  </div>
                )}
              </div>

              {/* Upload controls */}
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {tc('chooseImage')}
                </Button>

                {logoPreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {tc('delete')}
                  </Button>
                )}

                <p className="text-xs text-muted-foreground">
                  {t('logoSizeRecommendation')}<br />
                  {t('logoFormats')}
                </p>
              </div>
            </div>

            {/* Show logo on invoice toggle */}
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <div className="space-y-0.5">
                <Label htmlFor="show_logo_on_invoice">{t('showLogoOnInvoice')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('showLogoOnInvoiceHint')}
                </p>
              </div>
              <Switch
                id="show_logo_on_invoice"
                checked={settings?.show_logo_on_invoice ?? true}
                onCheckedChange={(checked) =>
                  setSettings(s => s ? { ...s, show_logo_on_invoice: checked } : null)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* SMTP E-post */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('emailSettings')}
            </CardTitle>
            <CardDescription>
              {t('emailSettingsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp_host">{t('smtpHost')}</Label>
                <Input
                  id="smtp_host"
                  value={settings?.smtp_host || ''}
                  onChange={(e) =>
                    setSettings(s => s ? { ...s, smtp_host: e.target.value } : null)
                  }
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_port">{t('smtpPort')}</Label>
                <Input
                  id="smtp_port"
                  type="number"
                  value={settings?.smtp_port || 587}
                  onChange={(e) =>
                    setSettings(s => s ? { ...s, smtp_port: parseInt(e.target.value) || 587 } : null)
                  }
                  placeholder="587"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp_user">{t('smtpUser')}</Label>
                <Input
                  id="smtp_user"
                  value={settings?.smtp_user || ''}
                  onChange={(e) =>
                    setSettings(s => s ? { ...s, smtp_user: e.target.value } : null)
                  }
                  placeholder={t('smtpUserPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_password">{t('smtpPassword')}</Label>
                <Input
                  id="smtp_password"
                  type="password"
                  value={settings?.smtp_password || ''}
                  onChange={(e) =>
                    setSettings(s => s ? { ...s, smtp_password: e.target.value } : null)
                  }
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp_from_email">{t('smtpFromEmail')}</Label>
                <Input
                  id="smtp_from_email"
                  type="email"
                  value={settings?.smtp_from_email || ''}
                  onChange={(e) =>
                    setSettings(s => s ? { ...s, smtp_from_email: e.target.value } : null)
                  }
                  placeholder={t('smtpFromPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_from_name">{t('smtpFromName')}</Label>
                <Input
                  id="smtp_from_name"
                  value={settings?.smtp_from_name || ''}
                  onChange={(e) =>
                    setSettings(s => s ? { ...s, smtp_from_name: e.target.value } : null)
                  }
                  placeholder={t('smtpFromNamePlaceholder')}
                />
              </div>
            </div>

            <div className="pt-4 border-t flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{t('testConnection')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('testConnectionHint', { email: settings?.email || '' })}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleTestEmail}
                disabled={testingEmail || !settings?.smtp_host}
              >
                {testingEmail ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {t('sendTestEmail')}
              </Button>
            </div>

            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">
                <strong>Gmail:</strong> {t('smtpGmail')}<br />
                <strong>Outlook:</strong> {t('smtpOutlook')}<br />
                <strong>{t('smtpCustom')}</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Sync */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('calendarSubscription')}
            </CardTitle>
            <CardDescription>
              {t('calendarSubscriptionDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {calendarUrl.includes('localhost') ? (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                <p className="font-medium text-sm">{t('localDevTitle')}</p>
                <p className="text-xs mt-1">
                  {t('localDevWarning')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{t('subscriptionUrl')}</Label>
                <div className="flex gap-2">
                  <Input
                    value={calendarUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={copyCalendarUrl}
                    className="shrink-0"
                  >
                    {calendarCopied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <h4 className="font-medium text-sm">{t('googleCalendar')}</h4>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>{t('googleCalendarStep1')}</li>
                  <li>{t('googleCalendarStep2')}</li>
                  <li>{t('googleCalendarStep3')}</li>
                  <li>{t('googleCalendarStep4')}</li>
                </ol>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <h4 className="font-medium text-sm">{t('appleCalendar')}</h4>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>{t('appleCalendarStep1')}</li>
                  <li>{t('appleCalendarStep2')}</li>
                  <li>{t('appleCalendarStep3')}</li>
                  <li>{t('appleCalendarStep4')}</li>
                </ol>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {t('calendarAutoUpdate')}
            </p>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              {t('subscription')}
            </CardTitle>
            <CardDescription>
              {t('subscriptionDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionSettings />
          </CardContent>
        </Card>

        {/* AI Usage */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  {t('aiUsage')}
                </CardTitle>
                <CardDescription>
                  {t('aiUsageDesc')}
                </CardDescription>
              </div>
              <Select value={aiUsagePeriod} onValueChange={setAiUsagePeriod}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">{t('last7Days')}</SelectItem>
                  <SelectItem value="30d">{t('last30Days')}</SelectItem>
                  <SelectItem value="all">{t('all')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {aiUsageLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : aiUsage ? (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">{t('totalCalls')}</p>
                    <p className="text-2xl font-bold">{aiUsage.totalCalls}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">{t('estimatedCost')}</p>
                    <p className="text-2xl font-bold">
                      ${aiUsage.totalCostUsd.toFixed(4)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ≈ {(aiUsage.totalCostUsd * 10.5).toFixed(2)} kr
                    </p>
                  </div>
                </div>

                {/* Breakdown by type */}
                {Object.keys(aiUsage.breakdown).length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-3">{t('breakdownByType')}</h4>
                    <div className="space-y-2">
                      {Object.entries(aiUsage.breakdown)
                        .sort((a, b) => b[1].cost - a[1].cost)
                        .map(([type, data]) => (
                          <div
                            key={type}
                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="text-sm">{data.label}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-medium">
                                {data.calls} {t('calls')}
                              </span>
                              <span className="text-sm text-muted-foreground ml-2">
                                ${data.cost.toFixed(4)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* No data message */}
                {aiUsage.totalCalls === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Cpu className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>{t('noAiUsage')}</p>
                    <p className="text-xs mt-1">
                      {t('aiUsageHint')}
                    </p>
                  </div>
                )}

                {/* Pricing info */}
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    {t('aiPricing')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('failedToLoadAiUsage')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {tc('saveSettings')}
        </Button>
      </div>
    </div>
  )
}
