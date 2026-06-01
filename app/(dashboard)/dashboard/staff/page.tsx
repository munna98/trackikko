import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { StaffSheet } from '@/components/staff/staff-sheet'
import { StaffListClient } from '@/components/staff/staff-list-client'
import { Users } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Staff' }

export default async function StaffPage() {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const businessId = user.businessId!
  const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'

  const staff = await prisma.user.findMany({
    where: { businessId, deletedAt: null },
    include: { role: true },
    orderBy: { name: 'asc' },
  })

  const serialised = staff.map((s: typeof staff[number]) => ({
    id: s.id,
    name: s.name,
    email: s.email ?? undefined,
    mobile: s.mobile ?? undefined,
    designation: s.designation ?? undefined,
    bloodGroup: s.bloodGroup ?? undefined,
    roleId: s.roleId,
    roleName: s.role.name,
    isActive: s.isActive,
    advanceBalance: s.advanceBalance.toNumber(),
    address: s.address ?? undefined,
    username: s.username ?? undefined,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Manage your team — operators, drivers, and supervisors."
        action={
          isAdmin ? (
            <StaffSheet currentUserId={user.id} />
          ) : undefined
        }
      />

      {staff.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff added yet"
          description="Add your first staff member to start tracking work and payments."
          action={
            isAdmin ? <StaffSheet currentUserId={user.id} /> : undefined
          }
        />
      ) : (
        <StaffListClient
          staff={serialised}
          isAdmin={isAdmin}
          currentUserId={user.id}
        />
      )}
    </div>
  )
}
