import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Wallet,
  Settings,
  BarChart3,
  Library,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  name: string
  href: string
  icon: LucideIcon
}

export const navigationItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Uppdrag', href: '/gigs', icon: Calendar },
  { name: 'Kalender', href: '/calendar', icon: CalendarDays },
  { name: 'Ekonomi', href: '/finance', icon: Wallet },
  { name: 'Repertoar', href: '/repertoire', icon: Library },
  { name: 'Analytik', href: '/analytics', icon: BarChart3 },
  { name: 'Inställningar', href: '/settings', icon: Settings },
]
