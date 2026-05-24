'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wallet, Tag, Cog } from 'lucide-react'
import { cn } from '@/lib/utils'

const settingsNav = [
  { href: '/dashboard/settings/accounts', icon: Wallet, label: 'Accounts' },
  { href: '/dashboard/settings/expense-categories', icon: Tag, label: 'Expense Categories' },
  { href: '/dashboard/settings/machine-types', icon: Cog, label: 'Machine Types' },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col gap-0.5 w-48 flex-shrink-0">
        {settingsNav.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Mobile tab strip */}
      <nav className="md:hidden flex gap-1 overflow-x-auto pb-1 border-b border-border mb-2">
        {settingsNav.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
