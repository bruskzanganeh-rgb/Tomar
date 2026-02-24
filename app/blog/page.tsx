import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog — Amida',
  description: 'Tips, templates and guides for freelance musicians. Invoicing, taxes, gig management and more.',
  alternates: { canonical: 'https://amida.babalisk.com/blog' },
}

const posts = [
  {
    slug: 'freelance-musician-invoice-template',
    title: 'Freelance Musician Invoice Template: What to Include & Free Download',
    description: 'A complete guide to creating professional invoices as a freelance musician — with a free template and common mistakes to avoid.',
    date: '2026-02-24',
  },
]

export default function BlogPage() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Blog</h1>
        <p className="text-[#C7D2FE]/60 mb-12">Tips, templates and guides for freelance musicians.</p>

        <div className="space-y-8">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block group rounded-2xl border border-[#1a3a5c] bg-[#102544] p-6 hover:border-[#F59E0B]/50 transition-colors"
            >
              <p className="text-xs text-[#C7D2FE]/40 mb-2">{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-[#F59E0B] transition-colors">{post.title}</h2>
              <p className="text-sm text-[#C7D2FE]/70 mb-4">{post.description}</p>
              <span className="inline-flex items-center gap-1 text-sm text-[#F59E0B] font-medium">
                Read more <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-[#1a3a5c] py-8">
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
