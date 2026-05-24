import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { MachineSheet } from '@/components/machines/machine-sheet'
import { MachineTabs } from '@/components/machines/machine-tabs'
import { ChevronLeft } from 'lucide-react'
import type { Metadata } from 'next'

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const machine = await prisma.machine.findUnique({ where: { id }, select: { name: true } })
  return { title: machine?.name ?? 'Machine' }
}

export default async function MachineDetailPage({ params }: PageProps) {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const { id } = await params
  const businessId = user.businessId!
  const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'

  const machine = await prisma.machine.findUnique({
    where: { id, deletedAt: null },
    include: {
      machineType: true,
      emis: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      oilChangeSchedule: true,
      oilChangeLogs: {
        where: { deletedAt: null },
        orderBy: { date: 'desc' },
        take: 20,
        include: { account: true },
      },
    },
  })

  if (!machine || machine.businessId !== businessId) notFound()

  const accounts = await prisma.account.findMany({
    where: { businessId, deletedAt: null, isActive: true },
    select: { id: true, name: true, type: true },
    orderBy: { name: 'asc' },
  })

  const machineTypes = await prisma.machineType.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [{ businessId: null }, { businessId }],
    },
    orderBy: { name: 'asc' },
  })

  // Serialise Decimal fields
  const serialisedMachine = {
    id: machine.id,
    name: machine.name,
    identifier: machine.identifier ?? undefined,
    capacity: machine.capacity ?? undefined,
    isActive: machine.isActive,
    currentMeterReading: machine.currentMeterReading.toNumber(),
    machineType: {
      id: machine.machineType.id,
      name: machine.machineType.name,
      trackingUnit: machine.machineType.trackingUnit,
    },
    emis: machine.emis.map((e: typeof machine.emis[number]) => ({
      id: e.id,
      financierName: e.financierName,
      monthlyAmount: e.monthlyAmount.toNumber(),
      totalInstallments: e.totalInstallments,
      installmentsPaid: e.installmentsPaid,
      startDate: e.startDate.toISOString(),
      status: e.status,
      isActive: e.isActive,
    })),
    oilChangeSchedule: machine.oilChangeSchedule
      ? {
          id: machine.oilChangeSchedule.id,
          intervalUnits: machine.oilChangeSchedule.intervalUnits.toNumber(),
          lastChangedAtReading: machine.oilChangeSchedule.lastChangedAtReading.toNumber(),
          lastChangedDate: machine.oilChangeSchedule.lastChangedDate.toISOString(),
          alertBeforeUnits: machine.oilChangeSchedule.alertBeforeUnits?.toNumber() ?? 20,
          notes: machine.oilChangeSchedule.notes ?? undefined,
        }
      : null,
    oilChangeLogs: machine.oilChangeLogs.map((log: typeof machine.oilChangeLogs[number]) => ({
      id: log.id,
      date: log.date.toISOString(),
      readingAtChange: log.readingAtChange.toNumber(),
      oilType: log.oilType ?? undefined,
      cost: log.cost?.toNumber() ?? undefined,
      accountName: log.account?.name ?? undefined,
      notes: log.notes ?? undefined,
    })),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/machines"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Back to machines"
            >
              <ChevronLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">{machine.name}</h1>
          </div>
          <div className="flex flex-wrap gap-2 pl-8">
            <Badge variant="secondary">{machine.machineType.name}</Badge>
            {machine.capacity && <Badge variant="outline">{machine.capacity}</Badge>}
            {machine.identifier && <Badge variant="outline">{machine.identifier}</Badge>}
            {!machine.isActive && (
              <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
            )}
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <MachineSheet
              machineTypes={machineTypes.map((t: typeof machineTypes[number]) => ({
                id: t.id,
                name: t.name,
                trackingUnit: t.trackingUnit,
              }))}
              defaultValues={{
                id: machine.id,
                machineTypeId: machine.machineTypeId,
                name: machine.name,
                identifier: machine.identifier ?? undefined,
                capacity: machine.capacity ?? undefined,
                currentMeterReading: machine.currentMeterReading.toNumber(),
              }}
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <MachineTabs
        machine={serialisedMachine}
        accounts={accounts}
        isAdmin={isAdmin}
      />
    </div>
  )
}
