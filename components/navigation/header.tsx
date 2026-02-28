"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Menu } from 'lucide-react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { navigationItems } from './nav-items'
import { UserMenu } from './user-menu'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export function Header() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <header className="sticky top-0 z-50 w-full border-b" style={{ backgroundColor: '#0B1E3A', borderColor: '#102544' }}>
      <div className="flex h-11 items-center gap-3 px-4 md:px-6">
        {/* Mobile: hamburger (left) */}
        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-white/10" style={{ color: '#ffffff' }}>
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t('menu')}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="px-6 py-4 border-b">
                <SheetTitle className="text-left">Amida</SheetTitle>
              </SheetHeader>

              <nav className="flex-1 space-y-1 px-3 py-4">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.nameKey}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                      {t(item.nameKey)}
                    </Link>
                  )
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo */}
        <Link href="/dashboard" className="mr-4 flex items-center gap-2 shrink-0">
          <Image
            src="/logo.png"
            alt="Amida"
            width={24}
            height={24}
          />
          <span className="text-[15px] font-bold tracking-tight" style={{ color: '#ffffff' }}>
            Amida
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 min-w-0">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.nameKey}
                href={item.href}
                className={cn(
                  'relative flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium',
                  !isActive && 'header-nav-link'
                )}
                style={{ color: isActive ? '#ffffff' : '#94a3b8' }}
              >
                <item.icon
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: isActive ? '#F59E0B' : undefined }}
                />
                <span className="hidden lg:inline">{t(item.nameKey)}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeHeaderNav"
                    className="absolute inset-x-1 -bottom-[calc(0.375rem+1px)] h-0.5 rounded-full"
                    style={{ backgroundColor: '#F59E0B' }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex-1 md:hidden" />
        <div className="flex items-center gap-2 shrink-0">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
