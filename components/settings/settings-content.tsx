'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Building2, CreditCard, Image, Loader2, Upload, Trash2, Calendar, Copy, Check, Cpu } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

type CompanySettings = {
  id: string
  company_name: string
  org_number: string
  address: string
  email: string
  phone: string
  bank_account: string
  logo_url: string | null
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
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [calendarCopied, setCalendarCopied] = useState(false)
  const [aiUsage, setAiUsage] = useState<AiUsageData | null>(null)
  const [aiUsagePeriod, setAiUsagePeriod] = useState('30d')
  const [aiUsageLoading, setAiUsageLoading] = useState(false)
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
      })
      .eq('id', settings.id)

    setSaving(false)

    if (error) {
      console.error('Error saving settings:', error)
      toast.error('Kunde inte spara inställningar: ' + error.message)
    } else {
      toast.success('Inställningar sparade!')
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 500KB)
    if (file.size > 500 * 1024) {
      toast.error('Logotypen får max vara 500KB')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Endast bildfiler tillåtna')
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
        <div className="text-muted-foreground">Laddar...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8" />
          Inställningar
        </h1>
        <p className="text-muted-foreground">
          Hantera företagsinformation och fakturainställningar
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Företagsinformation
            </CardTitle>
            <CardDescription>
              Denna information visas på dina fakturor
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Företagsnamn</Label>
              <Input
                id="company_name"
                value={settings?.company_name || ''}
                onChange={(e) =>
                  setSettings(s => s ? { ...s, company_name: e.target.value } : null)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org_number">Organisationsnummer</Label>
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
              <Label htmlFor="address">Adress</Label>
              <Input
                id="address"
                value={settings?.address || ''}
                onChange={(e) =>
                  setSettings(s => s ? { ...s, address: e.target.value } : null)
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-post</Label>
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
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={settings?.phone || ''}
                  onChange={(e) =>
                    setSettings(s => s ? { ...s, phone: e.target.value } : null)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank & Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Betalningsinformation
            </CardTitle>
            <CardDescription>
              Bankuppgifter som visas på fakturor
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank_account">Bankgiro / Kontonummer</Label>
              <Input
                id="bank_account"
                value={settings?.bank_account || ''}
                onChange={(e) =>
                  setSettings(s => s ? { ...s, bank_account: e.target.value } : null)
                }
                placeholder="XXXX-XXXX"
              />
              <p className="text-xs text-muted-foreground">
                Visas på fakturor med instruktionen att ange fakturanummer vid betalning
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Logotyp
            </CardTitle>
            <CardDescription>
              Ladda upp din logotyp som visas på fakturor (max 500KB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              {/* Preview */}
              <div className="w-48 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logotyp"
                    className="max-w-full max-h-full object-contain p-2"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Ingen logotyp</p>
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
                  Välj bild
                </Button>

                {logoPreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Ta bort
                  </Button>
                )}

                <p className="text-xs text-muted-foreground">
                  Rekommenderad storlek: 200x80 pixlar<br />
                  Format: PNG, JPG, SVG
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Sync */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Kalenderprenumeration
            </CardTitle>
            <CardDescription>
              Synka dina gigs till Google Calendar, iCloud eller andra kalenderappar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {calendarUrl.includes('localhost') ? (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                <p className="font-medium text-sm">Lokal utvecklingsmiljö</p>
                <p className="text-xs mt-1">
                  Kalenderprenumerationer kräver en publik URL. Deploya appen till Vercel eller liknande för att aktivera denna funktion.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Prenumerations-URL</Label>
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
                <h4 className="font-medium text-sm">Google Calendar</h4>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Öppna Google Calendar</li>
                  <li>Klicka på + bredvid "Andra kalendrar"</li>
                  <li>Välj "Från webbadress"</li>
                  <li>Klistra in URL:en ovan</li>
                </ol>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <h4 className="font-medium text-sm">Apple Calendar / iCloud</h4>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Öppna Kalender-appen</li>
                  <li>Arkiv → Ny kalenderprenumeration</li>
                  <li>Klistra in URL:en ovan</li>
                  <li>Klicka Prenumerera</li>
                </ol>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Kalendern uppdateras automatiskt. Uppdateringsintervallet styrs av din kalenderapp (vanligtvis 15 min - 24 timmar).
            </p>
          </CardContent>
        </Card>

        {/* AI Usage */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  AI-användning
                </CardTitle>
                <CardDescription>
                  Översikt över AI-kostnader för kvittoskanning och dokumentklassning
                </CardDescription>
              </div>
              <Select value={aiUsagePeriod} onValueChange={setAiUsagePeriod}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Senaste 7 dagar</SelectItem>
                  <SelectItem value="30d">Senaste 30 dagar</SelectItem>
                  <SelectItem value="all">Alla</SelectItem>
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
                    <p className="text-sm text-muted-foreground">Totalt antal anrop</p>
                    <p className="text-2xl font-bold">{aiUsage.totalCalls}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Uppskattad kostnad</p>
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
                    <h4 className="font-medium text-sm mb-3">Uppdelning per typ</h4>
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
                                {data.calls} anrop
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
                    <p>Ingen AI-användning under denna period</p>
                    <p className="text-xs mt-1">
                      AI används när du skannar kvitton eller importerar dokument
                    </p>
                  </div>
                )}

                {/* Pricing info */}
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Priser: Claude 3.5 Haiku $0.80/1M input, $4.00/1M output tokens.
                    Textbaserad parsing är billigare än bildanalys.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Kunde inte ladda AI-användningsdata</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Spara inställningar
        </Button>
      </div>
    </div>
  )
}
