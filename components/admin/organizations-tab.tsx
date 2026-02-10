'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Building2, ChevronDown, ChevronRight, Mail, Phone, MapPin, Trash2, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useFormatLocale } from '@/lib/hooks/use-format-locale'

type User = {
  user_id: string
  plan: string
  status: string
  stripe_customer_id: string | null
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

type Props = {
  users: User[]
  setUsers: React.Dispatch<React.SetStateAction<User[]>>
  onReload: () => void
}

export function OrganizationsTab({ users, setUsers, onReload }: Props) {
  const t = useTranslations('admin')
  const tSub = useTranslations('subscription')
  const tc = useTranslations('common')
  const formatLocale = useFormatLocale()

  const [expanded, setExpanded] = useState<string | null>(null)
  const [changingTier, setChangingTier] = useState<string | null>(null)
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Add user dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addMode, setAddMode] = useState<'invite' | 'create'>('invite')
  const [addForm, setAddForm] = useState({ email: '', password: '', company_name: '' })
  const [addSaving, setAddSaving] = useState(false)

  // Get current user ID for self-delete guard
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [])

  async function handleTierChange(userId: string, newPlan: string) {
    setChangingTier(userId)
    const res = await fetch(`/api/admin/users/${userId}/tier`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: newPlan }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, plan: newPlan } : u))
      toast.success(t('tierChanged'))
    } else {
      toast.error('Failed to change tier')
    }
    setChangingTier(null)
  }

  async function handleDeleteUser(userId: string) {
    if (userId === currentUserId) {
      toast.error(t('cannotDeleteSelf'))
      return
    }
    setDeletingUser(userId)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.user_id !== userId))
      toast.success(t('userDeleted'))
    } else {
      const data = await res.json()
      toast.error(data.error || 'Failed to delete user')
    }
    setDeletingUser(null)
    setConfirmDeleteId(null)
  }

  async function handleAddUser() {
    if (!addForm.email) return
    if (addMode === 'create' && addForm.password.length < 6) return

    setAddSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: addForm.email,
        password: addMode === 'create' ? addForm.password : undefined,
        company_name: addForm.company_name || undefined,
        mode: addMode,
      }),
    })

    if (res.ok) {
      toast.success(addMode === 'invite' ? t('inviteSent') : t('userCreated'))
      setAddDialogOpen(false)
      setAddForm({ email: '', password: '', company_name: '' })
      onReload()
    } else {
      const data = await res.json()
      toast.error(data.error || 'Failed')
    }
    setAddSaving(false)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {t('companies')} ({users.length})
          </CardTitle>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t('newUser')}
          </Button>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('noCompanies')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.user_id} className="rounded-lg bg-secondary/50 overflow-hidden">
                  <div
                    className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => setExpanded(expanded === u.user_id ? null : u.user_id)}
                  >
                    <div className="flex items-center gap-2">
                      {expanded === u.user_id ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{u.company_name || t('noName')}</p>
                          {u.org_number && (
                            <span className="text-[10px] text-muted-foreground">Org.nr {u.org_number}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.last_active && (
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">
                          {t('lastActive')}: {new Date(u.last_active).toLocaleDateString(formatLocale)}
                        </span>
                      )}
                      <Badge variant={u.plan === 'pro' ? 'default' : 'secondary'} className="text-xs">
                        {u.plan === 'pro' ? tSub('pro') : tSub('free')}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {new Date(u.created_at).toLocaleDateString(formatLocale)}
                      </span>
                    </div>
                  </div>

                  {expanded === u.user_id && (
                    <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-3">
                      {/* Contact info */}
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {u.email && (
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{u.email}</span>
                        )}
                        {u.phone && (
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{u.phone}</span>
                        )}
                        {u.address && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{u.address}</span>
                        )}
                      </div>

                      {/* Tier change */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium">{t('changeTier')}:</span>
                        <Select
                          value={u.plan}
                          onValueChange={v => handleTierChange(u.user_id, v)}
                          disabled={changingTier === u.user_id}
                        >
                          <SelectTrigger className="w-32 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">{tSub('free')}</SelectItem>
                            <SelectItem value="pro">{tSub('pro')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatBox label={t('invoiceCount')} value={u.invoice_count} />
                        <StatBox label={t('clientCount')} value={u.client_count} />
                        <StatBox label={t('gigTypeCount')} value={u.gig_type_count} />
                        <StatBox label={t('positionCount')} value={u.position_count} />
                        <StatBox label={t('expenseCount')} value={u.expense_count} />
                        <StatBox label={t('monthlyInvoices')} value={u.monthly_invoices} />
                        <StatBox label={t('monthlyScans')} value={u.monthly_scans} />
                      </div>

                      {/* Delete */}
                      {confirmDeleteId === u.user_id ? (
                        <div className="flex items-center gap-2 p-2 rounded bg-red-50 border border-red-200">
                          <p className="text-xs text-red-700 flex-1">{t('deleteUserConfirm')}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            {tc('cancel')}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            onClick={() => handleDeleteUser(u.user_id)}
                            disabled={deletingUser === u.user_id}
                          >
                            {deletingUser === u.user_id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                            {tc('delete')}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive h-7 text-xs"
                          onClick={() => setConfirmDeleteId(u.user_id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {t('deleteUser')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add user dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('newUser')}</DialogTitle>
            <DialogDescription>
              {addMode === 'invite' ? t('inviteMode') : t('createMode')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={addMode === 'invite' ? 'default' : 'outline'}
                onClick={() => setAddMode('invite')}
                className="flex-1"
              >
                {t('inviteUser')}
              </Button>
              <Button
                size="sm"
                variant={addMode === 'create' ? 'default' : 'outline'}
                onClick={() => setAddMode('create')}
                className="flex-1"
              >
                {t('createAccount')}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>{t('email')}</Label>
              <Input
                type="email"
                value={addForm.email}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('companyName')}</Label>
              <Input
                value={addForm.company_name}
                onChange={e => setAddForm(f => ({ ...f, company_name: e.target.value }))}
                placeholder="Företagsnamn AB"
              />
            </div>

            {addMode === 'create' && (
              <div className="space-y-2">
                <Label>{t('password')}</Label>
                <Input
                  type="password"
                  value={addForm.password}
                  onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••"
                />
                <p className="text-xs text-muted-foreground">{t('minPassword')}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>{tc('cancel')}</Button>
            <Button
              onClick={handleAddUser}
              disabled={addSaving || !addForm.email || (addMode === 'create' && addForm.password.length < 6)}
            >
              {addSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {addMode === 'invite' ? t('inviteUser') : t('createAccount')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background rounded-md px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}
