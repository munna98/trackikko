'use client'

import { useState, useRef, useEffect } from 'react'
import { LogOut, User } from 'lucide-react'
import { signOut } from '@/lib/auth'
import { getInitials } from '@/lib/utils'

type TopbarProps = {
  businessName: string
  userName: string
}

export function Topbar({ businessName, userName }: TopbarProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header
      className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
      style={{
        background: 'oklch(0.15 0.04 45)',
        borderBottom: '1px solid oklch(0.25 0.05 48)',
      }}
    >
      {/* Business name */}
      <span className="font-bold text-base" style={{ color: 'oklch(0.94 0.03 75)' }}>
        {businessName}
      </span>

      {/* Avatar + dropdown */}
      <div ref={ref} className="relative">
        <button
          id="topbar-avatar-btn"
          onClick={() => setOpen((v) => !v)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: 'oklch(0.30 0.07 50)', color: 'oklch(0.76 0.14 75)' }}
          aria-label="User menu"
          aria-expanded={open}
        >
          {getInitials(userName)}
        </button>

        {open && (
          <div
            className="absolute right-0 top-11 w-44 rounded-xl shadow-2xl overflow-hidden z-50"
            style={{
              background: 'oklch(0.20 0.05 45)',
              border: '1px solid oklch(0.28 0.05 50)',
            }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: 'oklch(0.28 0.05 50)' }}>
              <p className="text-sm font-semibold truncate" style={{ color: 'oklch(0.90 0.03 70)' }}>
                {userName}
              </p>
            </div>
            <div className="py-1">
              <button
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
                style={{ color: 'oklch(0.75 0.04 65)' }}
                onClick={() => setOpen(false)}
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <form action={signOut}>
                <button
                  type="submit"
                  id="topbar-logout-btn"
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: 'oklch(0.65 0.15 25)' }}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
