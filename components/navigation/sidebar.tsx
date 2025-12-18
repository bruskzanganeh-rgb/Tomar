"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  FileText,
  Receipt,
  Settings,
  PlusCircle,
  Tag,
  Download,
  BarChart3,
  Music,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Uppdragsgivare', href: '/clients', icon: Users },
  { name: 'Uppdrag', href: '/gigs', icon: Calendar },
  { name: 'Kalender', href: '/calendar', icon: CalendarDays },
  { name: 'Fakturor', href: '/invoices', icon: FileText },
  { name: 'Utgifter', href: '/expenses', icon: Receipt },
  { name: 'Analytik', href: '/analytics', icon: BarChart3 },
  { name: 'Uppdragstyper', href: '/gig-types', icon: Tag },
  { name: 'Positioner', href: '/positions', icon: Music },
  { name: 'Importera', href: '/import', icon: Download },
  { name: 'Inställningar', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">Babalisk Manager</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
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
