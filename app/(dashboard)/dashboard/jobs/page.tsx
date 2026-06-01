import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { JobsListClient } from '@/components/jobs/jobs-list-client'
import type { JobRow, FilterOption } from '@/components/jobs/jobs-list-client'
import { ClipboardList, Plus } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Jobs' }

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const businessId = user.businessId!
  const params = await searchParams
  const machineId = params.machineId ?? undefined
  const staffId = params.staffId ?? undefined
  const siteId = params.siteId ?? undefined
  const from = params.from ?? undefined
  const to = params.to ?? undefined
  const status = params.status ?? undefined

  const [jobs, machines, staffList, siteList] = await Promise.all([
    prisma.job.findMany({
      where: {
        businessId,
        deletedAt: null,
        ...(machineId && { machineId }),
        ...(staffId && { staffId }),
        ...(siteId && { siteId }),
        ...(from && { date: { gte: new Date(from) } }),
        ...(to && { date: { lte: new Date(to) } }),
        ...(status === 'reviewed' && { isReviewed: true }),
        ...(status === 'unreviewed' && { isReviewed: false }),
      },
      include: {
        machine: { include: { machineType: true } },
        site: { include: { party: true } },
        staff: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.machine.findMany({
      where: { businessId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { businessId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.site.findMany({
      where: { businessId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  type JobPrismaRow = (typeof jobs)[number]

  const serialJobs: JobRow[] = jobs.map((j: JobPrismaRow) => ({
    id: j.id,
    date: j.date.toISOString(),
    machineName: j.machine.name,
    machineId: j.machine.id,
    trackingUnit: j.machine.machineType.trackingUnit as 'hours' | 'trips' | 'km',
    partyName: j.site.party.name,
    siteName: j.site.name,
    siteId: j.site.id,
    mode: j.mode as 'bucket' | 'breaking' | null,
    quantity: j.quantity.toNumber(),
    rateType: j.rateType as 'per_hour' | 'per_trip',
    actualRate: j.actualRate.toNumber(),
    amount: j.amount.toNumber(),
    batha: j.batha.toNumber(),
    bathaPaidBy: j.bathaPaidBy,
    isReviewed: j.isReviewed,
    staffName: j.staff.name,
    staffId: j.staff.id,
  }))

  const serialMachines: FilterOption[] = machines.map((m) => ({ id: m.id, name: m.name }))
  const serialStaff: FilterOption[] = staffList.map((s) => ({ id: s.id, name: s.name }))
  const serialSites: FilterOption[] = siteList.map((s) => ({ id: s.id, name: s.name }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="All job entries across machines, operators, and sites."
        action={
          <Button id="log-job-btn" asChild>
            <Link href="/dashboard/jobs/new">
              <Plus className="w-4 h-4 mr-1.5" />
              New Job
            </Link>
          </Button>
        }
      />

      {jobs.length === 0 && !machineId && !staffId && !siteId && !from && !to ? (
        <EmptyState
          icon={ClipboardList}
          title="No jobs logged yet"
          description="Start logging jobs from the operator app or use the Log Job button above."
          action={
            <Button asChild>
              <Link href="/dashboard/jobs/new">
                <Plus className="w-4 h-4 mr-1.5" />
                New Job
              </Link>
            </Button>
          }
        />
      ) : (
        <JobsListClient
          jobs={serialJobs}
          machines={serialMachines}
          staffList={serialStaff}
          siteList={serialSites}
          currentMachineId={machineId}
          currentStaffId={staffId}
          currentSiteId={siteId}
          currentFrom={from}
          currentTo={to}
          currentStatus={status}
        />
      )}
    </div>
  )
}
