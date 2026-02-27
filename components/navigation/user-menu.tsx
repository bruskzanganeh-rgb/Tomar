"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { Shield, LogOut, Moon, Sun, ChevronDown, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserMenu() {
  const t = useTranslations('nav')
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    let cancelled = false

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user || cancelled) return

      setUserEmail(session.user.email || '')

      const [{ data: membership }, { data: admin }] = await Promise.all([
        supabase.from('company_members').select('company_id').limit(1).single(),
        supabase.rpc('is_admin', { uid: session.user.id }),
      ])

      let companyName = ''
      if (membership) {
        const { data: comp } = await supabase
          .from('companies')
          .select('company_name')
          .eq('id', membership.company_id)
          .single()
        companyName = comp?.company_name || ''
      }

      if (!cancelled) {
        setCompanyName(companyName)
        setIsAdmin(!!admin)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="header-nav-link flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium"
          style={{ color: '#C7D2FE', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span className="max-w-[100px] sm:max-w-[180px] truncate">
            {companyName || userEmail}
          </span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            {companyName && (
              <span className="font-medium text-sm">{companyName}</span>
            )}
            <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t('settings')}
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex items-center gap-2">
              <Shield className="h-4 w-4" style={{ color: '#ef4444' }} />
              {t('admin')}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {mounted && (
          <DropdownMenuItem
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" style={{ color: '#fbbf24' }} />
            ) : (
              <Moon className="h-4 w-4" style={{ color: '#475569' }} />
            )}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          {t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
