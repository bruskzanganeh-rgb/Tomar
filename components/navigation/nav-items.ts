import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Wallet,
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
  { nameKey: 'finance', href: '/finance', icon: Wallet },
  { nameKey: 'calendar', href: '/calendar', icon: CalendarDays },
  { nameKey: 'analytics', href: '/analytics', icon: BarChart3 },
  { nameKey: 'config', href: '/config', icon: SlidersHorizontal },
]
