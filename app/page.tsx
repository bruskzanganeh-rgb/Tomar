'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Calendar, FileText, Receipt, CalendarDays, Check, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { motion, type Variants } from 'framer-motion'

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] } },
}

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

export default function LandingPage() {
  const features = [
    {
      icon: Calendar,
      title: 'Gig management',
      desc: 'Track every gig, rehearsal and session — dates, fees and status at a glance.',
    },
    {
      icon: FileText,
      title: 'Invoicing',
      desc: 'Generate professional invoices with correct VAT in seconds. Send directly via email.',
    },
    {
      icon: Receipt,
      title: 'Receipt scanning',
      desc: 'Snap a photo and AI reads amounts, dates and suppliers automatically.',
    },
    {
      icon: CalendarDays,
      title: 'Calendar sync',
      desc: 'See all your gigs in a calendar. Syncs with Apple Calendar and Google Calendar.',
    },
  ]

  return (
    <div className="min-h-screen bg-[#0B1E3A]">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-[#1a3a5c] bg-[#0B1E3A]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Amida" width={32} height={32} />
            <span className="text-lg font-semibold tracking-tight text-white">Amida</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-[#C7D2FE] hover:text-white hover:bg-white/10" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" className="bg-[#F59E0B] text-[#0B1E3A] hover:bg-[#F59E0B]/90 font-medium" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="mx-auto max-w-5xl px-6 pt-24 pb-20 md:pt-36 md:pb-28"
      >
        <motion.p
          variants={fadeIn}
          className="text-sm font-medium text-[#F59E0B] tracking-wide uppercase mb-4"
        >
          Built for freelance musicians
        </motion.p>
        <motion.h1
          variants={fadeIn}
          className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-2xl leading-[1.1]"
        >
          Gigs, invoices and finances — all in one place.
        </motion.h1>
        <motion.p
          variants={fadeIn}
          className="mt-6 text-lg text-[#C7D2FE] max-w-xl leading-relaxed"
        >
          Stop juggling spreadsheets. Amida gives you everything you need to manage your music career — so you can focus on playing.
        </motion.p>
        <motion.div variants={fadeIn} className="mt-10 flex gap-3">
          <Button size="lg" className="bg-[#F59E0B] text-[#0B1E3A] hover:bg-[#F59E0B]/90 font-semibold" asChild>
            <Link href="/signup" className="gap-2">
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </motion.section>

      {/* Features */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="border-t border-[#1a3a5c] bg-[#102544]"
      >
        <div className="mx-auto max-w-5xl px-6 py-24">
          <motion.p variants={fadeIn} className="text-sm font-medium text-[#F59E0B] tracking-wide uppercase mb-3">
            Features
          </motion.p>
          <motion.h2 variants={fadeIn} className="text-3xl font-bold tracking-tight text-white mb-14">
            Everything you need, nothing you don&apos;t.
          </motion.h2>
          <div className="grid sm:grid-cols-2 gap-8">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeIn}
                className="group"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
                    <feature.icon className="h-5 w-5 text-[#F59E0B]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-sm text-[#C7D2FE]/70 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Pricing */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
      >
        <div className="mx-auto max-w-5xl px-6 py-24">
          <motion.p variants={fadeIn} className="text-sm font-medium text-[#F59E0B] tracking-wide uppercase mb-3">
            Pricing
          </motion.p>
          <motion.h2 variants={fadeIn} className="text-3xl font-bold tracking-tight text-white mb-14">
            Simple, transparent pricing.
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl">
            {/* Free */}
            <motion.div
              variants={fadeIn}
              className="rounded-2xl border border-[#1a3a5c] bg-[#102544] p-6"
            >
              <p className="text-sm font-medium text-[#C7D2FE]/70 mb-1">Free</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">0 kr</span>
                <span className="text-sm text-[#C7D2FE]/50">/mån</span>
              </div>
              <div className="space-y-3 mb-8">
                {['Unlimited gigs', 'Basic invoicing', 'Calendar view'].map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-[#C7D2FE]">
                    <Check className="h-4 w-4 text-[#C7D2FE]/50 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full bg-transparent border-[#1a3a5c] text-[#C7D2FE] hover:bg-white/5 hover:text-white" asChild>
                <Link href="/signup">Get started</Link>
              </Button>
            </motion.div>

            {/* Pro */}
            <motion.div
              variants={fadeIn}
              className="rounded-2xl border-2 border-[#F59E0B] bg-[#102544] p-6 relative"
            >
              <div className="absolute -top-3 left-6 bg-[#F59E0B] text-[#0B1E3A] text-xs font-semibold px-3 py-1 rounded-full">
                Most popular
              </div>
              <p className="text-sm font-medium text-[#C7D2FE]/70 mb-1">Pro</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">49 kr</span>
                <span className="text-sm text-[#C7D2FE]/50">/mån</span>
              </div>
              <div className="space-y-3 mb-8">
                {[
                  'Everything in Free',
                  'AI receipt scanning',
                  'Advanced analytics',
                  'Calendar sync (iCal)',
                  'Send invoices via email',
                  'No Amida branding on invoices',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-[#C7D2FE]">
                    <Check className="h-4 w-4 text-[#F59E0B] shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <Button className="w-full bg-[#F59E0B] text-[#0B1E3A] hover:bg-[#F59E0B]/90 font-medium" asChild>
                <Link href="/signup">Start free trial</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="border-t border-[#1a3a5c] bg-[#102544]"
      >
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <motion.h2
            variants={fadeIn}
            className="text-3xl font-bold tracking-tight text-white mb-4"
          >
            Ready to simplify your music business?
          </motion.h2>
          <motion.p variants={fadeIn} className="text-[#C7D2FE] mb-8 max-w-md mx-auto">
            Join musicians who use Amida to spend less time on admin and more time making music.
          </motion.p>
          <motion.div variants={fadeIn}>
            <Button size="lg" className="bg-[#F59E0B] text-[#0B1E3A] hover:bg-[#F59E0B]/90 font-semibold" asChild>
              <Link href="/signup" className="gap-2">
                Get started for free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-[#1a3a5c] py-8">
        <div className="mx-auto max-w-5xl px-6 flex items-center justify-between text-sm text-[#C7D2FE]/50">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Amida" width={24} height={24} />
            <span>Amida</span>
          </div>
          <span>&copy; {new Date().getFullYear()} Amida. Built for musicians.</span>
        </div>
      </footer>
    </div>
  )
}
