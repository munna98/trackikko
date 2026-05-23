import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { MobileNav } from '@/components/layout/mobile-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (!user.businessId) {
    redirect('/setup')
  }

  // Operators should never reach dashboard — send to their dedicated interface
  if (user.roleId === 'operator') {
    redirect('/operator/log-job')
  }

  const businessName = user.business?.name ?? 'My Business'
  const userName = user.name
  const roleName = user.role.name

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <Sidebar businessName={businessName} userName={userName} roleName={roleName} />

      {/* Mobile topbar */}
      <Topbar businessName={businessName} userName={userName} />

      {/* Main content */}
      <main
        className="md:ml-60 pt-14 md:pt-0 pb-16 md:pb-0 min-h-screen"
      >
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
