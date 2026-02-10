"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { PlusCircle, Shield } from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import { navigationItems } from './nav-items'
import { ThemeToggle } from '@/components/theme-toggle'
import { createClient } from '@/lib/supabase/client'

const sidebarVariants: Variants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
}

const navItemVariants: Variants = {
  hidden: { x: -10, opacity: 0 },
  visible: { x: 0, opacity: 1 }
}

export function Sidebar() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data } = await supabase.rpc('is_admin', { uid: session.user.id })
        if (!cancelled) setIsAdmin(!!data)
      }
    }

    checkAdmin()

    return () => { cancelled = true }
  }, [])

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={sidebarVariants}
      className="hidden md:flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border"
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-sidebar-border">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-xl font-bold text-foreground"
        >
          Babalisk Manager
        </motion.h1>
        <ThemeToggle />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigationItems.map((item, index) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <motion.div
              key={item.nameKey}
              variants={navItemVariants}
              custom={index}
            >
              <Link
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {/* Active background */}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-xl bg-sidebar-accent"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}

                {/* Hover background */}
                <span className="absolute inset-0 rounded-xl bg-sidebar-accent/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                {/* Content */}
                <span className="relative z-10 flex items-center gap-3">
                  <item.icon className={cn(
                    "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                    isActive && "text-blue-400"
                  )} />
                  <span>{t(item.nameKey)}</span>
                </span>

                {/* Active indicator dot */}
                {isActive && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-3 z-10 h-1.5 w-1.5 rounded-full bg-blue-400"
                  />
                )}
              </Link>
            </motion.div>
          )
        })}

        {/* Admin link */}
        {isAdmin && (
          <motion.div
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <Link
              href="/admin"
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                pathname === '/admin'
                  ? 'text-foreground'
                  : 'text-red-500 hover:text-red-400'
              )}
            >
              {pathname === '/admin' && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-xl bg-sidebar-accent"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="absolute inset-0 rounded-xl bg-sidebar-accent/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <span className="relative z-10 flex items-center gap-3">
                <Shield className="h-5 w-5" />
                <span>{t('admin')}</span>
              </span>
            </Link>
          </motion.div>
        )}
      </nav>

      {/* Quick Actions */}
      <div className="border-t border-sidebar-border p-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link
            href="/gigs"
            className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200"
          >
            <PlusCircle className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
            {t('newGig')}
          </Link>
        </motion.div>
      </div>
    </motion.div>
  )
}
