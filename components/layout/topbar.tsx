'use client'

import { useState, useRef, useEffect } from 'react'
import { LogOut, User } from 'lucide-react'
import { signOut } from '@/lib/auth'
import { getInitials } from '@/lib/utils'

type TopbarProps = { businessName: string; userName: string }

export function Topbar({ businessName, userName }: TopbarProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-sidebar border-b border-sidebar-border">
      <span className="font-bold text-base text-primary">{businessName}</span>

      <div ref={ref} className="relative">
        <button id="topbar-avatar-btn" onClick={() => setOpen((v) => !v)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-primary/20 text-primary"
          aria-label="User menu" aria-expanded={open}>
          {getInitials(userName)}
        </button>

        {open && (
          <div className="absolute right-0 top-11 w-44 rounded-xl shadow-2xl overflow-hidden z-50 bg-popover border border-border">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold truncate text-popover-foreground">{userName}</p>
            </div>
            <div className="py-1">
              <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                onClick={() => setOpen(false)}>
                <User className="w-4 h-4" /> Profile
              </button>
              <form action={signOut}>
                <button type="submit" id="topbar-logout-btn"
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
