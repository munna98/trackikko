'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Receipt,
  Users,
  MoreHorizontal,
  Truck,
  Building2,
  BarChart3,
  Settings,
  X,
} from 'lucide-react'

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
      {/* Bottom Nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
        style={{
          background: 'oklch(0.15 0.04 45)',
          borderTop: '1px solid oklch(0.25 0.05 48)',
          height: '60px',
        }}
      >
        {primaryNav.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors"
              style={{ color: isActive ? 'oklch(0.76 0.14 75)' : 'oklch(0.55 0.04 60)' }}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          )
        })}

        {/* More button */}
        <button
          id="mobile-nav-more-btn"
          onClick={() => setSheetOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors"
          style={{ color: 'oklch(0.55 0.04 60)' }}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>

      {/* Sheet overlay */}
      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 md:hidden"
            onClick={() => setSheetOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl pb-6 md:hidden"
            style={{
              background: 'oklch(0.17 0.04 45)',
              border: '1px solid oklch(0.25 0.05 48)',
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'oklch(0.25 0.05 48)' }}>
              <span className="font-semibold text-sm" style={{ color: 'oklch(0.94 0.03 75)' }}>
                More
              </span>
              <button
                id="mobile-nav-close-btn"
                onClick={() => setSheetOpen(false)}
                style={{ color: 'oklch(0.65 0.04 60)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-3 space-y-1">
              {moreNav.map(({ href, icon: Icon, label }) => {
                const isActive = pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: isActive ? 'oklch(0.76 0.14 75 / 0.12)' : 'transparent',
                      color: isActive ? 'oklch(0.76 0.14 75)' : 'oklch(0.75 0.04 65)',
                    }}
                  >
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
