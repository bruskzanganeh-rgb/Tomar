'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Plus, Camera, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

export function BottomNav() {
  const pathname = usePathname()
  const t = useTranslations('mobile')

  const navItems = [
    { href: '/m', icon: Home, label: t('home') },
    { href: '/m/gig', icon: Plus, label: t('addGig') },
    { href: '/m/receipt', icon: Camera, label: t('photoReceipt') },
    { href: '/m/gigs', icon: List, label: t('assignments') },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('h-6 w-6', isActive && 'scale-110')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
