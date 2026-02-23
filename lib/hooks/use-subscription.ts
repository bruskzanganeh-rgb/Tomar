'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Subscription = {
  id: string
  plan: 'free' | 'pro' | 'team'
  status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

type Usage = {
  invoice_count: number
  receipt_scan_count: number
}

type StorageQuota = {
  usedBytes: number
  limitBytes: number
  plan: string
}

type FreeLimits = {
  invoices: number
  receiptScans: number
}

const DEFAULT_LIMITS: FreeLimits = {
  invoices: 5,
  receiptScans: 3,
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [freeLimits, setFreeLimits] = useState<FreeLimits>(DEFAULT_LIMITS)
  const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadSubscription()
    loadFreeLimits()
    loadStorageQuota()
  }, [])

  async function loadFreeLimits() {
    try {
      const res = await fetch('/api/config/limits')
      if (res.ok) {
        const data = await res.json()
        setFreeLimits(data)
      }
    } catch {
      // Use defaults on failure
    }
  }

  async function loadStorageQuota() {
    try {
      const res = await fetch('/api/storage/quota')
      if (res.ok) {
        const data = await res.json()
        setStorageQuota(data)
      }
    } catch {
      // Ignore - storage quota is non-critical
    }
  }

  async function loadSubscription() {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .single()

    // Sync with Stripe if user has a Stripe customer ID
    if (sub?.stripe_customer_id) {
      try {
        await fetch('/api/stripe/sync', { method: 'POST' })
        // Re-fetch after sync to get updated data
        const { data: refreshed } = await supabase
          .from('subscriptions')
          .select('*')
          .single()
        if (refreshed) {
          setSubscription(refreshed)
        } else {
          setSubscription(sub)
        }
      } catch {
        setSubscription(sub)
      }
    } else {
      setSubscription(sub)
    }

    const now = new Date()
    const { data: usageData } = await supabase
      .from('usage_tracking')
      .select('invoice_count, receipt_scan_count')
      .eq('year', now.getFullYear())
      .eq('month', now.getMonth() + 1)
      .single()

    setUsage(usageData || { invoice_count: 0, receipt_scan_count: 0 })
    setLoading(false)
  }

  const isPro = (subscription?.plan === 'pro' || subscription?.plan === 'team') && subscription?.status === 'active'
  const isTeam = subscription?.plan === 'team' && subscription?.status === 'active'

  const limits = {
    invoices: isPro ? Infinity : freeLimits.invoices,
    receiptScans: isPro ? Infinity : freeLimits.receiptScans,
  }

  const canCreateInvoice = isPro || (usage?.invoice_count || 0) < limits.invoices
  const canScanReceipt = isPro || (usage?.receipt_scan_count || 0) < limits.receiptScans

  return {
    subscription,
    usage,
    loading,
    isPro,
    isTeam,
    limits,
    canCreateInvoice,
    canScanReceipt,
    storageQuota,
    refresh: loadSubscription,
  }
}
