import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Star, MessageSquare, Users, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Become a Founding Member — Amida',
  description: 'Join Amida as a founding member. Get Pro free for 12 months in exchange for your feedback and help spreading the word.',
  alternates: { canonical: 'https://amida.babalisk.com/founding-members' },
}

const benefits = [
  {
    icon: Gift,
    title: 'Pro plan free for 12 months',
    desc: 'Unlimited invoices, unlimited receipt scanning, no branding — all the Pro features at no cost.',
  },
  {
    icon: Star,
    title: 'Shape the product',
    desc: 'Your feedback goes directly to the team. Help us build the features musicians actually need.',
  },
  {
    icon: Users,
    title: 'Founding member badge',
    desc: 'A permanent badge on your profile as one of our earliest supporters.',
  },
]

const asks = [
  {
    icon: MessageSquare,
    title: 'Share honest feedback',
    desc: 'Tell us what works, what doesn\'t, and what\'s missing. A quick message or email is all it takes.',
  },
  {
    icon: Star,
    title: 'Leave a review',
    desc: 'Once you\'ve used Amida for a few weeks, leave an honest review to help other musicians find us.',
  },
  {
    icon: Users,
    title: 'Tell 2 musician friends',
    desc: 'Know someone who could use better invoicing or gig tracking? Send them our way.',
  },
]

export default function FoundingMembersPage() {
  return (
    <div className="min-h-screen bg-[#0B1E3A]">
      <header className="border-b border-[#1a3a5c] bg-[#0B1E3A]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Amida" width={32} height={32} />
            <span className="text-lg font-semibold tracking-tight text-white">Amida</span>
          </Link>
          <Link href="/signup" className="text-sm text-[#F59E0B] hover:text-[#F59E0B]/80 font-medium">
            Get started free
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-[#F59E0B] tracking-wide uppercase mb-4">
            Limited spots
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
            Become a Founding Member
          </h1>
          <p className="text-lg text-[#C7D2FE]/70 max-w-xl mx-auto">
            We&apos;re looking for freelance musicians who want to help shape the future of Amida. In return, you get Pro free for a full year.
          </p>
        </div>

        {/* What you get */}
        <section className="mb-16">
          <h2 className="text-sm font-medium text-[#F59E0B] tracking-wide uppercase mb-6">What you get</h2>
          <div className="grid gap-4">
            {benefits.map((item) => (
              <div key={item.title} className="flex items-start gap-4 rounded-xl border border-[#1a3a5c] bg-[#102544] p-5">
                <div className="h-10 w-10 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-[#C7D2FE]/70">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What we ask */}
        <section className="mb-16">
          <h2 className="text-sm font-medium text-[#F59E0B] tracking-wide uppercase mb-6">What we ask</h2>
          <div className="grid gap-4">
            {asks.map((item) => (
              <div key={item.title} className="flex items-start gap-4 rounded-xl border border-[#1a3a5c] bg-[#102544] p-5">
                <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-[#C7D2FE]/60" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-[#C7D2FE]/70">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl border border-[#1a3a5c] bg-[#102544] p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Ready to join?
          </h2>
          <p className="text-[#C7D2FE]/70 mb-6 max-w-md mx-auto">
            Sign up for free and we&apos;ll upgrade your account to Pro. No credit card required.
          </p>
          <Button size="lg" className="bg-[#F59E0B] text-[#0B1E3A] hover:bg-[#F59E0B]/90 font-semibold" asChild>
            <Link href="/signup" className="gap-2">
              Sign up as founding member <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>

      <footer className="border-t border-[#1a3a5c] py-8 mt-16">
        <div className="mx-auto max-w-3xl px-6 flex items-center justify-between text-sm text-[#C7D2FE]/50">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Amida" width={24} height={24} />
            <span>&copy; {new Date().getFullYear()} Amida</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-[#C7D2FE] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[#C7D2FE] transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
