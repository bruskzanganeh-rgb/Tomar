'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Music, Calendar, FileText, Receipt, CalendarDays, Check } from 'lucide-react'
import { motion, type Variants } from 'framer-motion'

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

export default function LandingPage() {
  const t = useTranslations('landing')

  const features = [
    { icon: Calendar, title: t('featureGigs'), desc: t('featureGigsDesc') },
    { icon: FileText, title: t('featureInvoices'), desc: t('featureInvoicesDesc') },
    { icon: Receipt, title: t('featureReceipts'), desc: t('featureReceiptsDesc') },
    { icon: CalendarDays, title: t('featureCalendar'), desc: t('featureCalendarDesc') },
  ]

  const freeFeatures = [t('freeFeature1'), t('freeFeature2'), t('freeFeature3')]
  const proFeatures = [t('proFeature1'), t('proFeature2'), t('proFeature3'), t('proFeature4')]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-blue-500" />
            <span className="text-xl font-bold tracking-tight">Tomar</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">{t('login')}</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">{t('getStarted')}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="container mx-auto px-4 py-20 md:py-32 text-center"
      >
        <motion.div variants={fadeIn} className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Music className="h-8 w-8 text-blue-500" />
          </div>
        </motion.div>
        <motion.h1
          variants={fadeIn}
          className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl mx-auto"
        >
          {t('heroTitle')}
        </motion.h1>
        <motion.p
          variants={fadeIn}
          className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          {t('heroSubtitle')}
        </motion.p>
        <motion.div variants={fadeIn} className="mt-10 flex gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/signup">{t('getStarted')}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">{t('login')}</Link>
          </Button>
        </motion.div>
      </motion.section>

      {/* Features */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={stagger}
        className="container mx-auto px-4 py-20"
      >
        <motion.h2
          variants={fadeIn}
          className="text-3xl font-bold text-center mb-12"
        >
          {t('features')}
        </motion.h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <motion.div key={feature.title} variants={fadeIn}>
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                    <feature.icon className="h-5 w-5 text-blue-500" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Pricing */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={stagger}
        className="container mx-auto px-4 py-20"
      >
        <motion.h2
          variants={fadeIn}
          className="text-3xl font-bold text-center mb-12"
        >
          {t('pricing')}
        </motion.h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Free */}
          <motion.div variants={fadeIn}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-xl">{t('free')}</CardTitle>
                <div className="text-3xl font-bold">
                  {t('freePrice')}
                  <span className="text-sm font-normal text-muted-foreground">{t('perMonth')}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {freeFeatures.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    {f}
                  </div>
                ))}
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href="/signup">{t('getStarted')}</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pro */}
          <motion.div variants={fadeIn}>
            <Card className="h-full border-blue-500/50 shadow-blue-500/5 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">{t('pro')}</CardTitle>
                <div className="text-3xl font-bold">
                  {t('proPrice')}
                  <span className="text-sm font-normal text-muted-foreground">{t('perMonth')}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {freeFeatures.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    {f}
                  </div>
                ))}
                {proFeatures.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-blue-500 shrink-0" />
                    {f}
                  </div>
                ))}
                <Button className="w-full mt-4" asChild>
                  <Link href="/signup">{t('choosePlan')}</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Music className="h-4 w-4" />
          <span>{t('footer')}</span>
        </div>
      </footer>
    </div>
  )
}
