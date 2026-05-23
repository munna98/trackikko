'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PlusCircle, Receipt, Banknote, ClipboardList } from 'lucide-react'

const operatorNavItems = [
  { href: '/operator/log-job', icon: PlusCircle, label: 'Log Job' },
  { href: '/operator/log-expense', icon: Receipt, label: 'Log Expense' },
  { href: '/operator/log-advance', icon: Banknote, label: 'Log Advance' },
  { href: '/operator/my-records', icon: ClipboardList, label: 'My Records' },
]

export function OperatorNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
      style={{
        background: 'oklch(0.15 0.04 45)',
        borderTop: '1px solid oklch(0.25 0.05 48)',
        minHeight: '60px',
      }}
    >
      {operatorNavItems.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors py-2"
            style={{ color: isActive ? 'oklch(0.76 0.14 75)' : 'oklch(0.55 0.04 60)' }}
          >
            <Icon
              className="w-6 h-6"
              style={{ color: isActive ? 'oklch(0.76 0.14 75)' : 'oklch(0.50 0.04 58)' }}
            />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
