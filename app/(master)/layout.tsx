import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { signOut } from '@/lib/auth'
import Link from 'next/link'
import { Building2, Users, Cog, Tag, LogOut, LayoutGrid } from 'lucide-react'

const masterNav = [
  { href: '/master', label: 'Overview', icon: LayoutGrid },
  { href: '/master/businesses', label: 'Businesses', icon: Building2 },
  { href: '/master/users', label: 'Users', icon: Users },
  { href: '/master/machine-types', label: 'Machine Types', icon: Cog },
  { href: '/master/expense-categories', label: 'Expense Categories', icon: Tag },
]

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.roleId !== 'master_admin') redirect('/dashboard')

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-56 flex flex-col fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <span className="font-bold text-base text-primary">Trackikko</span>
          <p className="text-xs mt-0.5 text-muted-foreground">Master Admin</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {masterNav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all">
              <Icon className="w-4 h-4 text-muted-foreground" />{label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-sidebar-border">
          <form action={signOut}>
            <button type="submit" id="master-logout-btn"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all">
              <LogOut className="w-4 h-4" />Logout
            </button>
          </form>
        </div>
      </aside>
      <main className="ml-56 flex-1 p-6">{children}</main>
    </div>
  )
}
