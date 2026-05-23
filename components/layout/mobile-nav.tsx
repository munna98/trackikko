'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Receipt, Users, MoreHorizontal, Truck, Building2, BarChart3, Settings, X } from 'lucide-react'

const primaryNav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/jobs', icon: ClipboardList, label: 'Jobs' },
  { href: '/dashboard/expenses', icon: Receipt, label: 'Expenses' },
  { href: '/dashboard/staff', icon: Users, label: 'Staff' },
]

const moreNav = [
  { href: '/dashboard/machines', icon: Truck, label: 'Machines' },
  { href: '/dashboard/parties', icon: Building2, label: 'Parties & Sites' },
  { href: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

export function MobileNav() {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch bg-sidebar border-t border-sidebar-border" style={{ minHeight: '60px' }}>
        {primaryNav.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors py-2
                ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          )
        })}
        <button id="mobile-nav-more-btn" onClick={() => setSheetOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted-foreground">
          <MoreHorizontal className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>

      {sheetOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={() => setSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl pb-6 md:hidden bg-card border border-border">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="font-semibold text-sm text-foreground">More</span>
              <button id="mobile-nav-close-btn" onClick={() => setSheetOpen(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-3 space-y-1">
              {moreNav.map(({ href, icon: Icon, label }) => {
                const isActive = pathname.startsWith(href)
                return (
                  <Link key={href} href={href} onClick={() => setSheetOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all
                      ${isActive ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-accent'}`}>
                    <Icon className="w-5 h-5" />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}
