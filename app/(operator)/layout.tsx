import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { signOut } from '@/lib/auth'
import { OperatorNav } from '@/components/layout/operator-nav'
import { ThemeToggle } from '@/components/theme-toggle'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LogOut, User } from 'lucide-react'

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!user.businessId) redirect('/setup')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-sidebar border-b border-sidebar-border">
        <span className="font-bold text-base text-primary">Trackikko</span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                aria-label="User menu"
              >
                <span className="text-sm font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              <div className="flex flex-col gap-2">
                <div className="px-2 py-1.5 border-b border-border mb-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email || user.mobile}</p>
                </div>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </form>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>
      <main className="flex-1 pt-14 pb-16">
        <div className="px-4 py-4">{children}</div>
      </main>
      <OperatorNav />
    </div>
  )
}
