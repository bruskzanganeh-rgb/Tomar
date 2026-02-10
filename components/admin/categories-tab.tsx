'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Music, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

type InstrumentCategory = {
  id: string
  name: string
  slug?: string
  sort_order?: number
  instrument_count?: number
}

type Props = {
  categories: InstrumentCategory[]
  setCategories: React.Dispatch<React.SetStateAction<InstrumentCategory[]>>
  onReload: () => void
}

export function CategoriesTab({ categories, setCategories, onReload }: Props) {
  const t = useTranslations('admin')
  const tc = useTranslations('common')
  const supabase = createClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: '', sort_order: 0 })
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!form.name) return
    setSaving(true)
    const slug = form.name.toLowerCase().replace(/[^a-zåäö0-9]+/g, '-')
    const { error } = await supabase.from('instrument_categories').insert({
      name: form.name,
      slug,
      sort_order: form.sort_order,
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(t('categorySaved'))
      setDialogOpen(false)
      setForm({ name: '', sort_order: 0 })
      onReload()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('instrument_categories').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
    } else {
      setCategories(prev => prev.filter(c => c.id !== id))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold">{t('categories')}</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          {t('newCategory')}
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Music className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t('noCategories')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {categories.map(c => (
            <Card key={c.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.instrument_count || 0} {t('instrumentCount')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">#{c.sort_order}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('newCategory')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('categoryName')}</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Stråk / Strings" />
            </div>
            <div className="space-y-2">
              <Label>{t('sortOrder')}</Label>
              <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tc('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
