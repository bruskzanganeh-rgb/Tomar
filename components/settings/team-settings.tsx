'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Users, Copy, Check, Loader2, UserPlus, Crown, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useTranslations } from 'next-intl'
import { useCompany } from '@/lib/hooks/use-company'
import { useSubscription } from '@/lib/hooks/use-subscription'
import { createClient } from '@/lib/supabase/client'

export function TeamSettings() {
  const t = useTranslations('team')
  const tc = useTranslations('common')
  const { company, companyId, isOwner, members, mutate } = useCompany()
  const { isTeam } = useSubscription()
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null)
  const [showOnlyMyData, setShowOnlyMyData] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('company_settings')
        .select('show_only_my_data')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (data) setShowOnlyMyData((data as any).show_only_my_data ?? false)
        })
    })
  }, [supabase])

  async function handleToggleShowOnlyMyData() {
    const newValue = !showOnlyMyData
    setShowOnlyMyData(newValue)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('company_settings')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ show_only_my_data: newValue } as any)
      .eq('user_id', user.id)
    if (error) {
      setShowOnlyMyData(!newValue)
      toast.error(tc('saveError'))
    } else {
      toast.success(tc('saved'))
    }
  }

  async function handleCreateInvite() {
    setCreating(true)
    try {
      const res = await fetch('/api/invitations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail || undefined }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || t('inviteError'))
        return
      }

      setInviteUrl(data.url)
      setInviteEmail('')
      toast.success(t('inviteCreated'))
    } catch {
      toast.error(t('inviteError'))
    } finally {
      setCreating(false)
    }
  }

  async function copyInviteUrl() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy')
    }
  }

  async function handleToggleVisibility() {
    if (!companyId || !company) return
    const newVisibility = company.gig_visibility === 'shared' ? 'personal' : 'shared'

    const { error } = await supabase.from('companies').update({ gig_visibility: newVisibility }).eq('id', companyId)

    if (error) {
      toast.error(t('visibilityError'))
    } else {
      mutate()
      toast.success(t('visibilityUpdated'))
    }
  }

  async function handleRemoveMember(memberId: string) {
    const { error } = await supabase
      .from('company_members')
      .update({ removed_at: new Date().toISOString() })
      .eq('id', memberId)

    if (error) {
      toast.error(t('removeMemberError'))
    } else {
      mutate()
      toast.success(t('memberRemoved'))
    }
  }

  if (!isTeam) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('upgradeRequired')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('upgradeDescription')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('members')}
          </CardTitle>
          <CardDescription>{t('membersDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{member.email || member.user_id.slice(0, 8) + '...'}</span>
                {member.role === 'owner' && (
                  <Badge variant="secondary" className="gap-1">
                    <Crown className="h-3 w-3" />
                    {t('owner')}
                  </Badge>
                )}
              </div>
              {isOwner && member.role !== 'owner' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRemoveMemberId(member.id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Invite */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {t('inviteMember')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t('emailOptional')}
                type="email"
              />
              <Button onClick={handleCreateInvite} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : t('createInvite')}
              </Button>
            </div>
            {inviteUrl && (
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly className="text-xs" />
                <Button variant="outline" size="sm" onClick={copyInviteUrl}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Visibility */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>{t('gigVisibility')}</CardTitle>
            <CardDescription>{t('gigVisibilityDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('sharedMode')}</Label>
                <p className="text-xs text-muted-foreground">{t('sharedModeDescription')}</p>
              </div>
              <Switch checked={company?.gig_visibility === 'shared'} onCheckedChange={handleToggleVisibility} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personal filter */}
      {company?.gig_visibility === 'shared' && members.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('personalFilter')}</CardTitle>
            <CardDescription>{t('personalFilterDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('showOnlyMyData')}</Label>
                <p className="text-xs text-muted-foreground">{t('showOnlyMyDataDesc')}</p>
              </div>
              <Switch checked={showOnlyMyData} onCheckedChange={handleToggleShowOnlyMyData} />
            </div>
          </CardContent>
        </Card>
      )}
      <ConfirmDialog
        open={!!removeMemberId}
        onOpenChange={(open) => {
          if (!open) setRemoveMemberId(null)
        }}
        title={t('removeMemberConfirmTitle')}
        description={t('removeMemberConfirmDesc')}
        confirmLabel={tc('delete')}
        cancelLabel={tc('cancel')}
        variant="destructive"
        onConfirm={() => {
          if (removeMemberId) handleRemoveMember(removeMemberId)
          setRemoveMemberId(null)
        }}
      />
    </div>
  )
}
