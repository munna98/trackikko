'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Truck, Users, Building2, ClipboardList, Receipt, BarChart3, Settings, LogOut } from 'lucide-react'
import { signOut } from '@/lib/auth'
import { getInitials } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import Image from 'next/image'
import logoImg from '@/public/logo.png'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/machines', icon: Truck, label: 'Machines' },
  { href: '/dashboard/staff', icon: Users, label: 'Staff' },
  { href: '/dashboard/parties', icon: Building2, label: 'Parties & Sites' },
  { href: '/dashboard/jobs', icon: ClipboardList, label: 'Jobs' },
  { href: '/dashboard/expenses', icon: Receipt, label: 'Expenses' },
  { href: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

type SidebarProps = { businessName: string; userName: string; roleName: string }

export function Sidebar({ businessName, userName, roleName }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-60 z-30 bg-sidebar border-r border-sidebar-border">
      {/* Business header */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            <Image src={logoImg} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate leading-tight text-sidebar-foreground">{businessName}</p>
            <p className="text-xs leading-tight text-muted-foreground">Heavy Equipment</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive ? 'bg-primary/15 text-primary' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              {label}
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-primary/20 text-primary">
            {getInitials(userName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate text-sidebar-foreground">{userName}</p>
            <span className="text-xs px-1.5 py-0.5 rounded-md font-medium bg-primary/15 text-primary">{roleName}</span>
          </div>
          <ThemeToggle compact />
        </div>
        <form action={signOut}>
          <button type="submit" id="sidebar-logout-btn"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-sidebar-accent">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </form>
      </div>
    </aside>
  )
}
