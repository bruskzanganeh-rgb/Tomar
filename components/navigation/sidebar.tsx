"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PlusCircle } from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import { navigationItems } from './nav-items'

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

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={sidebarVariants}
      className="hidden md:flex h-full w-64 flex-col glass-dark"
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-white/10">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
        >
          Babalisk Manager
        </motion.h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigationItems.map((item, index) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <motion.div
              key={item.name}
              variants={navItemVariants}
              custom={index}
            >
              <Link
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                {/* Active background */}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-xl bg-white/10 backdrop-blur-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}

                {/* Hover background */}
                <span className="absolute inset-0 rounded-xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                {/* Content */}
                <span className="relative flex items-center gap-3">
                  <item.icon className={cn(
                    "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                    isActive && "text-blue-400"
                  )} />
                  <span>{item.name}</span>
                </span>

                {/* Active indicator dot */}
                {isActive && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-3 h-1.5 w-1.5 rounded-full bg-blue-400"
                  />
                )}
              </Link>
            </motion.div>
          )
        })}
      </nav>

      {/* Quick Actions */}
      <div className="border-t border-white/10 p-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link
            href="/gigs"
            className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200"
          >
            <PlusCircle className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
            Nytt uppdrag
          </Link>
        </motion.div>
      </div>
    </motion.div>
  )
}
