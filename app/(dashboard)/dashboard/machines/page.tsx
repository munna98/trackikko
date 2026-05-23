import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { MachineSheet } from '@/components/machines/machine-sheet'
import { MachinesListClient } from '@/components/machines/machines-list-client'
import { Truck } from 'lucide-react'
import type { Metadata } from 'next'
import type { Status } from '@/components/ui/status-badge'

type TrackingUnit = 'hours' | 'trips' | 'km'

export const metadata: Metadata = { title: 'Machines' }

type MachineWithRelations = Awaited<ReturnType<typeof fetchMachines>>[number]

async function fetchMachines(businessId: string) {
  return prisma.machine.findMany({
    where: { businessId, deletedAt: null },
    include: {
      machineType: true,
      emis: { where: { deletedAt: null, status: 'active' } },
      oilChangeSchedule: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

function getOilStatus(machine: MachineWithRelations): Status | null {
  const s = machine.oilChangeSchedule
  if (!s) return null
  const remaining =
    s.lastChangedAtReading.toNumber() +
    s.intervalUnits.toNumber() -
    machine.currentMeterReading.toNumber()
  if (remaining <= 0) return 'overdue'
  if (remaining <= (s.alertBeforeUnits?.toNumber() ?? 20)) return 'due_soon'
  return 'ok'
}

export default async function MachinesPage() {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const businessId = user.businessId!
  const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'

  const [machines, machineTypes] = await Promise.all([
    fetchMachines(businessId),
    prisma.machineType.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [{ businessId: null }, { businessId }],
      },
      orderBy: { name: 'asc' },
    }),
  ])

  type MachineTypeRow = (typeof machineTypes)[number]
  const serialisedMachineTypes = machineTypes.map((t: MachineTypeRow) => ({
    id: t.id,
    name: t.name,
    trackingUnit: t.trackingUnit as TrackingUnit,
  }))

  const serialisedMachines = machines.map((m: MachineWithRelations) => ({
    id: m.id,
    name: m.name,
    typeName: m.machineType.name,
    trackingUnit: m.machineType.trackingUnit as TrackingUnit,
    identifier: m.identifier ?? undefined,
    capacity: m.capacity ?? undefined,
    currentMeterReading: m.currentMeterReading.toNumber(),
    oilStatus: getOilStatus(m),
    activeEmiCount: m.emis.length,
    isActive: m.isActive,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Machines"
        description="Manage your fleet — equipment, EMI, and oil change schedules."
        action={
          isAdmin ? (
            <MachineSheet machineTypes={serialisedMachineTypes} />
          ) : undefined
        }
      />

      {machines.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No machines added yet"
          description="Add your first machine to start tracking jobs, EMIs, and oil changes."
          action={isAdmin ? <MachineSheet machineTypes={serialisedMachineTypes} /> : undefined}
        />
      ) : (
        <MachinesListClient
          machines={serialisedMachines}
          machineTypes={serialisedMachineTypes}
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}
