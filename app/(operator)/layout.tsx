import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { signOut } from '@/lib/auth'
import { OperatorNav } from '@/components/layout/operator-nav'

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!user.businessId) redirect('/setup')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-sidebar border-b border-sidebar-border">
        <span className="font-bold text-base text-primary">Trackikko</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.name}</span>
          <form action={signOut}>
            <button type="submit" id="operator-logout-btn"
              className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground transition-colors">
              Logout
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 pt-14 pb-16">
        <div className="px-4 py-4">{children}</div>
      </main>
      <OperatorNav />
    </div>
  )
}
