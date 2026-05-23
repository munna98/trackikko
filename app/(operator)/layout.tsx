import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { signOut } from '@/lib/auth'
import { OperatorNav } from '@/components/layout/operator-nav'

export default async function OperatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) redirect('/login')
  if (!user.businessId) redirect('/setup')

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'oklch(0.12 0.03 50)' }}
    >
      {/* Topbar */}
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
        style={{
          background: 'oklch(0.15 0.04 45)',
          borderBottom: '1px solid oklch(0.25 0.05 48)',
        }}
      >
        <span className="font-bold text-base" style={{ color: 'oklch(0.76 0.14 75)' }}>
          Trackikko
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'oklch(0.70 0.04 65)' }}>
            {user.name}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              id="operator-logout-btn"
              className="text-xs px-2.5 py-1.5 rounded-lg transition-colors"
              style={{
                background: 'oklch(0.22 0.04 48)',
                color: 'oklch(0.65 0.05 65)',
                border: '1px solid oklch(0.28 0.05 50)',
              }}
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      {/* Content area fills between topbar and bottom nav */}
      <main className="flex-1 pt-14 pb-16">
        <div className="px-4 py-4">
          {children}
        </div>
      </main>

      {/* Bottom Nav — client component */}
      <OperatorNav />
    </div>
  )
}
