import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/page-header'
import { MachineTypeDialog } from '@/components/settings/machine-type-dialog'
import { MachineTypesClient } from '@/components/settings/machine-types-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Machine Types' }

export default async function MachineTypesPage() {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const businessId = user.businessId!
  const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'

  const machineTypes = await prisma.machineType.findMany({
    where: {
      deletedAt: null,
      OR: [{ businessId: null }, { businessId }],
    },
    orderBy: [{ businessId: 'asc' }, { name: 'asc' }],
  })

  type TypeRow = (typeof machineTypes)[number]
  const serialised = machineTypes.map((t: TypeRow) => ({
    id: t.id,
    name: t.name,
    trackingUnit: t.trackingUnit as 'hours' | 'trips' | 'km',
    hasModes: t.hasModes,
    isBillable: t.isBillable,
    isActive: t.isActive,
    isGlobal: t.businessId === null,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Machine Types"
        description="Manage machine type definitions and tracking units."
        action={isAdmin ? <MachineTypeDialog /> : undefined}
      />
      <MachineTypesClient machineTypes={serialised} isAdmin={isAdmin} />
    </div>
  )
}
