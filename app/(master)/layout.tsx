import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { signOut } from '@/lib/auth'
import Link from 'next/link'
import { Building2, Users, Cog, Tag, LogOut } from 'lucide-react'

const masterNav = [
  { href: '/master', label: 'Overview', icon: Building2 },
  { href: '/master/businesses', label: 'Businesses', icon: Building2 },
  { href: '/master/users', label: 'Users', icon: Users },
  { href: '/master/machine-types', label: 'Machine Types', icon: Cog },
  { href: '/master/expense-categories', label: 'Expense Categories', icon: Tag },
]

export default async function MasterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) redirect('/login')
  if (user.roleId !== 'master_admin') redirect('/dashboard')

  return (
    <div className="min-h-screen flex" style={{ background: 'oklch(0.12 0.03 50)' }}>
      {/* Sidebar */}
      <aside
        className="w-56 flex flex-col fixed left-0 top-0 h-screen"
        style={{
          background: 'oklch(0.15 0.04 45)',
          borderRight: '1px solid oklch(0.25 0.05 48)',
        }}
      >
        <div className="px-5 py-5 border-b" style={{ borderColor: 'oklch(0.25 0.05 48)' }}>
          <span className="font-bold text-base" style={{ color: 'oklch(0.76 0.14 75)' }}>
            Trackikko
          </span>
          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0.04 55)' }}>
            Master Admin
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {masterNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ color: 'oklch(0.70 0.04 65)' }}
            >
              <Icon className="w-4 h-4" style={{ color: 'oklch(0.55 0.04 60)' }} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t" style={{ borderColor: 'oklch(0.25 0.05 48)' }}>
          <form action={signOut}>
            <button
              type="submit"
              id="master-logout-btn"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ color: 'oklch(0.60 0.04 60)' }}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <main className="ml-56 flex-1 p-6">
        {children}
      </main>
    </div>
  )
}
