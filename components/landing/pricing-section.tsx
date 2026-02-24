'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, type Variants } from 'framer-motion'

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] } },
}

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

type TierData = { priceMonthly: number; features: string[] }
type TierConfig = { free: TierData; pro: TierData; team: TierData }

const DEFAULT_TIERS: TierConfig = {
  free: { priceMonthly: 0, features: ['unlimitedGigs', 'basicInvoicing', 'calendarView'] },
  pro: { priceMonthly: 5, features: ['unlimitedInvoices', 'unlimitedScans', 'noBranding'] },
  team: { priceMonthly: 10, features: ['everythingInPro', 'inviteMembers', 'sharedCalendar'] },
}

const featureLabels: Record<string, string> = {
  unlimitedGigs: 'Unlimited gigs',
  basicInvoicing: 'Basic invoicing',
  calendarView: 'Calendar view',
  unlimitedInvoices: 'Unlimited invoices',
  unlimitedScans: 'Unlimited receipt scanning',
  noBranding: 'No branding on invoices',
  everythingInPro: 'Everything in Pro',
  inviteMembers: 'Invite team members',
  sharedCalendar: 'Shared calendar and gigs',
}

export function PricingSection() {
  const [tiers, setTiers] = useState<TierConfig>(DEFAULT_TIERS)

  useEffect(() => {
    fetch('/api/config/tiers')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setTiers({
          free: { priceMonthly: data.free?.priceMonthly ?? 0, features: data.free?.features ?? DEFAULT_TIERS.free.features },
          pro: { priceMonthly: data.pro?.priceMonthly ?? 5, features: data.pro?.features ?? DEFAULT_TIERS.pro.features },
          team: { priceMonthly: data.team?.priceMonthly ?? 10, features: data.team?.features ?? DEFAULT_TIERS.team.features },
        })
      })
      .catch(() => {})
  }, [])

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={stagger}
      className="grid md:grid-cols-3 gap-6"
    >
      {/* Free */}
      <motion.div variants={fadeIn} className="rounded-2xl border border-[#1a3a5c] bg-[#102544] p-6">
        <p className="text-sm font-medium text-[#C7D2FE]/70 mb-1">Free</p>
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-4xl font-bold text-white">${tiers.free.priceMonthly}</span>
          <span className="text-sm text-[#C7D2FE]/50">/mo</span>
        </div>
        <div className="space-y-3 mb-8">
          {tiers.free.features.map((key) => (
            <div key={key} className="flex items-center gap-2.5 text-sm text-[#C7D2FE]">
              <Check className="h-4 w-4 text-[#C7D2FE]/50 shrink-0" />
              {featureLabels[key] || key}
            </div>
          ))}
        </div>
        <Button variant="outline" className="w-full bg-transparent border-[#1a3a5c] text-[#C7D2FE] hover:bg-white/5 hover:text-white" asChild>
          <Link href="/signup">Get started</Link>
        </Button>
      </motion.div>

      {/* Pro */}
      <motion.div variants={fadeIn} className="rounded-2xl border-2 border-[#F59E0B] bg-[#102544] p-6 relative">
        <div className="absolute -top-3 left-6 bg-[#F59E0B] text-[#0B1E3A] text-xs font-semibold px-3 py-1 rounded-full">
          Most popular
        </div>
        <p className="text-sm font-medium text-[#C7D2FE]/70 mb-1">Pro</p>
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-4xl font-bold text-white">${tiers.pro.priceMonthly}</span>
          <span className="text-sm text-[#C7D2FE]/50">/mo</span>
        </div>
        <div className="space-y-3 mb-8">
          {tiers.pro.features.map((key) => (
            <div key={key} className="flex items-center gap-2.5 text-sm text-[#C7D2FE]">
              <Check className="h-4 w-4 text-[#F59E0B] shrink-0" />
              {featureLabels[key] || key}
            </div>
          ))}
        </div>
        <Button className="w-full bg-[#F59E0B] text-[#0B1E3A] hover:bg-[#F59E0B]/90 font-medium" asChild>
          <Link href="/signup">Start free trial</Link>
        </Button>
      </motion.div>

      {/* Team */}
      <motion.div variants={fadeIn} className="rounded-2xl border border-[#1a3a5c] bg-[#102544] p-6">
        <p className="text-sm font-medium text-[#C7D2FE]/70 mb-1">Team</p>
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-4xl font-bold text-white">${tiers.team.priceMonthly}</span>
          <span className="text-sm text-[#C7D2FE]/50">/mo</span>
        </div>
        <div className="space-y-3 mb-8">
          {tiers.team.features.map((key) => (
            <div key={key} className="flex items-center gap-2.5 text-sm text-[#C7D2FE]">
              <Check className="h-4 w-4 text-[#F59E0B] shrink-0" />
              {featureLabels[key] || key}
            </div>
          ))}
        </div>
        <Button variant="outline" className="w-full bg-transparent border-[#1a3a5c] text-[#C7D2FE] hover:bg-white/5 hover:text-white" asChild>
          <Link href="/signup">Get started</Link>
        </Button>
      </motion.div>
    </motion.div>
  )
}
