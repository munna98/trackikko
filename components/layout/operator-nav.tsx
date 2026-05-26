'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PlusCircle, Receipt, Banknote, ClipboardList } from 'lucide-react'

const operatorNavItems = [
  { href: '/operator/my-records', icon: ClipboardList, label: 'My Records' },
  { href: '/operator/log-job', icon: PlusCircle, label: 'Log Job' },
  { href: '/operator/log-expense', icon: Receipt, label: 'Log Expense' },
  { href: '/operator/log-advance', icon: Banknote, label: 'Log Advance' },
]

export function OperatorNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch bg-sidebar border-t border-sidebar-border" style={{ minHeight: '60px' }}>
      {operatorNavItems.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link key={href} href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors py-2 mx-1 my-1 rounded-xl
              ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-sidebar-accent/50'}`}>
            <Icon className="w-6 h-6" />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
