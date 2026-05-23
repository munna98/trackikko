'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      id="theme-toggle-btn"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`
        flex items-center justify-center rounded-lg transition-all duration-200
        hover:bg-accent text-muted-foreground hover:text-foreground
        ${compact ? 'w-8 h-8' : 'w-9 h-9'}
      `}
    >
      {isDark ? (
        <Sun className={compact ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />
      ) : (
        <Moon className={compact ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />
      )}
    </button>
  )
}
