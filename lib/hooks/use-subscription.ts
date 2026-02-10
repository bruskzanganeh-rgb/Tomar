'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Subscription = {
  id: string
  plan: 'free' | 'pro'
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

const FREE_LIMITS = {
  invoices: 5,
  receiptScans: 3,
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadSubscription()
  }, [])

  async function loadSubscription() {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .single()

    const now = new Date()
    const { data: usageData } = await supabase
      .from('usage_tracking')
      .select('invoice_count, receipt_scan_count')
      .eq('year', now.getFullYear())
      .eq('month', now.getMonth() + 1)
      .single()

    setSubscription(sub)
    setUsage(usageData || { invoice_count: 0, receipt_scan_count: 0 })
    setLoading(false)
  }

  const isPro = subscription?.plan === 'pro' && subscription?.status === 'active'

  const limits = {
    invoices: isPro ? Infinity : FREE_LIMITS.invoices,
    receiptScans: isPro ? Infinity : FREE_LIMITS.receiptScans,
  }

  const canCreateInvoice = isPro || (usage?.invoice_count || 0) < limits.invoices
  const canScanReceipt = isPro || (usage?.receipt_scan_count || 0) < limits.receiptScans

  return {
    subscription,
    usage,
    loading,
    isPro,
    limits,
    canCreateInvoice,
    canScanReceipt,
    refresh: loadSubscription,
  }
}
