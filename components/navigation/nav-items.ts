import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Wallet,
  Settings,
  BarChart3,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  nameKey: string
  href: string
  icon: LucideIcon
}

export const navigationItems: NavItem[] = [
  { nameKey: 'dashboard', href: '/', icon: LayoutDashboard },
  { nameKey: 'gigs', href: '/gigs', icon: Calendar },
  { nameKey: 'calendar', href: '/calendar', icon: CalendarDays },
  { nameKey: 'finance', href: '/finance', icon: Wallet },
  { nameKey: 'config', href: '/config', icon: SlidersHorizontal },
  { nameKey: 'analytics', href: '/analytics', icon: BarChart3 },
  { nameKey: 'settings', href: '/settings', icon: Settings },
]
