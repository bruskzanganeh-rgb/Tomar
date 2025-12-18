'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Building2, CreditCard, Image, Loader2, Upload, Trash2 } from 'lucide-react'

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

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [])

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
      alert('Kunde inte spara inställningar: ' + error.message)
    } else {
      alert('Inställningar sparade!')
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 500KB)
    if (file.size > 500 * 1024) {
      alert('Logotypen får max vara 500KB')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Endast bildfiler tillåtna')
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
