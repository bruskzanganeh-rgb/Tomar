"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PlusCircle } from 'lucide-react'
import { navigationItems } from './nav-items'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden md:flex h-full w-64 flex-col bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">Babalisk Manager</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Quick Actions */}
      <div className="border-t border-gray-800 p-4">
        <Link
          href="/gigs"
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Nytt uppdrag
        </Link>
      </div>
    </div>
  )
}
