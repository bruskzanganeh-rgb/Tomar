'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSubscription } from '@/lib/hooks/use-subscription'
import { useCompany } from '@/lib/hooks/use-company'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, Check, Crown, Info, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function SubscriptionSettings() {
  const t = useTranslations('subscription')
  const tc = useTranslations('common')
  const tToast = useTranslations('toast')

  const { subscription, usage, isPro, isTeam, limits, loading, refresh } = useSubscription()
  const { isOwner } = useCompany()
  const [upgrading, setUpgrading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const searchParams = useSearchParams()

  // Sync subscription from Stripe after successful checkout
  useEffect(() => {
    if (searchParams.get('upgrade') === 'success') {
      fetch('/api/stripe/sync', { method: 'POST' })
        .then(() => refresh())
    }
  }, [searchParams])

  async function handleUpgrade(priceId: string, plan: 'pro' | 'team' = 'pro') {
    setUpgrading(true)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, plan }),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || tToast('checkoutError'))
      }
    } catch (err: any) {
      toast.error(err.message)
      setUpgrading(false)
    }
  }

  async function handleReactivate() {
    setReactivating(true)
    try {
      const res = await fetch('/api/stripe/reactivate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t('reactivateSuccess'))
      refresh()
    } catch (err: any) {
      toast.error(t('reactivateError'))
    } finally {
      setReactivating(false)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    try {
      const res = await fetch('/api/stripe/cancel', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t('cancelSuccess'))
      refresh()
    } catch (err: any) {
      toast.error(t('cancelError'))
    } finally {
      setCancelling(false)
      setShowCancelConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const planLabel = isTeam ? t('team') : isPro ? t('pro') : t('free')

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('yourPlan')}</CardTitle>
            <Badge variant={isPro ? 'default' : 'secondary'} className="text-xs">
              {isTeam ? (
                <>
                  <Users className="h-3 w-3 mr-1" />
                  {t('team')}
                </>
              ) : isPro ? (
                <>
                  <Crown className="h-3 w-3 mr-1" />
                  {t('pro')}
                </>
              ) : (
                t('free')
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isPro ? (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {isTeam ? t('teamAccess') : t('unlimitedAccess')}
              </p>
              {subscription?.current_period_end && (
                <p className="text-xs text-muted-foreground">
                  {t('renewsAt', { date: new Date(subscription.current_period_end).toLocaleDateString('sv-SE') })}
                </p>
              )}
              {subscription?.cancel_at_period_end && (
                <div className="mt-2">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {t('cancelledActiveUntil')}
                  </p>
                  <Button
                    onClick={handleReactivate}
                    size="sm"
                    className="mt-2"
                    disabled={reactivating}
                  >
                    {reactivating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                    {t('reactivate')}
                  </Button>
                </div>
              )}
              {!subscription?.cancel_at_period_end && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={cancelling}
                  >
                    {cancelling ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                    {t('cancelSubscription')}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                {t('usageThisMonth')}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('invoicesUsage')}</span>
                  <span className={usage && usage.invoice_count >= limits.invoices ? 'text-red-500 font-medium' : ''}>
                    {usage?.invoice_count || 0} / {limits.invoices}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-1.5">
                  <div
                    className="bg-primary rounded-full h-1.5 transition-all"
                    style={{ width: `${Math.min(((usage?.invoice_count || 0) / limits.invoices) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm mt-3">
                  <span>{t('receiptScans')}</span>
                  <span className={usage && usage.receipt_scan_count >= limits.receiptScans ? 'text-red-500 font-medium' : ''}>
                    {usage?.receipt_scan_count || 0} / {limits.receiptScans}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-1.5">
                  <div
                    className="bg-primary rounded-full h-1.5 transition-all"
                    style={{ width: `${Math.min(((usage?.receipt_scan_count || 0) / limits.receiptScans) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment status warnings */}
      {subscription?.status === 'past_due' && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {t('pastDueWarning')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {subscription?.status === 'canceled' && (
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                {t('canceledInfo')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade options */}
      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title={t('cancelConfirmTitle')}
        description={t('cancelConfirmDesc')}
        confirmLabel={t('cancelSubscription')}
        cancelLabel={tc('cancel')}
        variant="destructive"
        onConfirm={handleCancel}
      />

      {/* Pro upgrade cards (shown when not Pro, only if price IDs are configured) */}
      {!isPro && process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('proMonthly')}</CardTitle>
              <CardDescription>
                <span className="text-2xl font-bold text-foreground">49 kr</span>
                <span className="text-muted-foreground"> {t('perMonth')}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  {t('unlimitedInvoices')}
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  {t('unlimitedScans')}
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  {t('noBranding')}
                </li>
              </ul>
              <Button
                onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '', 'pro')}
                disabled={upgrading}
                className="w-full"
                variant="outline"
              >
                {upgrading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('upgrade')}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('proYearly')}</CardTitle>
                <Badge className="text-[10px]">{t('save15')}</Badge>
              </div>
              <CardDescription>
                <span className="text-2xl font-bold text-foreground">499 kr</span>
                <span className="text-muted-foreground"> {t('perYear')}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  {t('unlimitedInvoices')}
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  {t('unlimitedScans')}
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  {t('noBranding')}
                </li>
              </ul>
              <Button
                onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || '', 'pro')}
                disabled={upgrading}
                className="w-full"
              >
                {upgrading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('upgrade')}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team upgrade cards (shown to owners who are not on Team plan, only if price IDs are configured) */}
      {isOwner && !isTeam && process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('teamPlanTitle')}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('teamMonthly')}
                </CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">99 kr</span>
                  <span className="text-muted-foreground"> {t('perMonth')}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    {t('everythingInPro')}
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    {t('inviteMembers')}
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    {t('sharedCalendar')}
                  </li>
                </ul>
                <Button
                  onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID || '', 'team')}
                  disabled={upgrading}
                  className="w-full"
                  variant="outline"
                >
                  {upgrading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isPro ? t('upgradeToTeam') : t('upgrade')}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {t('teamYearly')}
                  </CardTitle>
                  <Badge className="text-[10px]">{t('save15')}</Badge>
                </div>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">999 kr</span>
                  <span className="text-muted-foreground"> {t('perYear')}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    {t('everythingInPro')}
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    {t('inviteMembers')}
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    {t('sharedCalendar')}
                  </li>
                </ul>
                <Button
                  onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_TEAM_YEARLY_PRICE_ID || '', 'team')}
                  disabled={upgrading}
                  className="w-full"
                >
                  {upgrading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isPro ? t('upgradeToTeam') : t('upgrade')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
