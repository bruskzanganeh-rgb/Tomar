"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Menu, X, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { navigationItems } from './nav-items'

export function MobileHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="md:hidden flex h-14 items-center justify-between border-b bg-gray-900 px-4">
      <h1 className="text-lg font-bold text-white">Babalisk</h1>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Meny</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 bg-gray-900 text-white p-0 border-gray-800">
          <SheetHeader className="px-6 py-4 border-b border-gray-800">
            <SheetTitle className="text-white text-left">Babalisk Manager</SheetTitle>
          </SheetHeader>

          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
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

          <div className="border-t border-gray-800 p-4">
            <Link
              href="/gigs"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              Nytt uppdrag
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
