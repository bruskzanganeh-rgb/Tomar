'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

type Props = {
  configValues: Record<string, string>
  setConfigValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  savingConfig: boolean
  onSave: () => void
}

export function ConfigTab({ configValues, setConfigValues, savingConfig, onSave }: Props) {
  const t = useTranslations('admin')
  const tc = useTranslations('common')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('freeLimits')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t('freeInvoiceLimit')}</Label>
          <Input
            type="number"
            value={configValues['free_invoice_limit'] || '5'}
            onChange={e => setConfigValues(prev => ({ ...prev, free_invoice_limit: e.target.value }))}
            min={0}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('freeScanLimit')}</Label>
          <Input
            type="number"
            value={configValues['free_receipt_scan_limit'] || '3'}
            onChange={e => setConfigValues(prev => ({ ...prev, free_receipt_scan_limit: e.target.value }))}
            min={0}
          />
        </div>
        <div className="space-y-2 pt-4 border-t">
          <Label>{t('brandingName')}</Label>
          <Input
            value={configValues['branding_name'] || 'Babalisk Manager'}
            onChange={e => setConfigValues(prev => ({ ...prev, branding_name: e.target.value }))}
            placeholder="Babalisk Manager"
          />
          <p className="text-xs text-muted-foreground">{t('brandingNameHint')}</p>
        </div>
        <Button onClick={onSave} disabled={savingConfig}>
          {savingConfig && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {tc('save')}
        </Button>
      </CardContent>
    </Card>
  )
}
