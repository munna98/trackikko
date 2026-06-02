import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ArrowLeft } from 'lucide-react'
import { AdminJobForm } from '@/components/jobs/admin-job-form'
import type { SerialMachine, SerialSite, SerialRateCard } from '@/components/jobs/operator-job-form'
import type { SerialStaff } from '@/components/jobs/admin-job-form'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Log Job' }

const ADMIN_ROLES = ['master_admin', 'admin']

export default async function AdminNewJobPage() {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')
  if (!ADMIN_ROLES.includes(user.roleId)) redirect('/dashboard/jobs')

  const businessId = user.businessId!

  const [machines, sites, rateCards, staffList] = await Promise.all([
    prisma.machine.findMany({
      where: { businessId, deletedAt: null, isActive: true },
      include: { machineType: true },
      orderBy: { name: 'asc' },
    }),
    prisma.site.findMany({
      where: { businessId, deletedAt: null, isActive: true },
      include: { party: true },
      orderBy: [{ party: { name: 'asc' } }, { name: 'asc' }],
    }),
    prisma.rateCard.findMany({
      where: { businessId, deletedAt: null, isActive: true },
    }),
    prisma.user.findMany({
      where: { businessId, deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        roleId: true,
        defaultMachineId: true,
        defaultSiteId: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  type MachineRow = (typeof machines)[number]
  type SiteRow = (typeof sites)[number]
  type RateCardRow = (typeof rateCards)[number]
  type StaffRow = (typeof staffList)[number]

  const serialMachines: SerialMachine[] = machines.map((m: MachineRow) => ({
    id: m.id,
    name: m.name,
    trackingUnit: m.machineType.trackingUnit as 'hours' | 'trips' | 'km',
    hasModes: m.machineType.hasModes,
    currentMeterReading: m.currentMeterReading.toNumber(),
  }))

  const serialSites: SerialSite[] = sites.map((s: SiteRow) => ({
    id: s.id,
    name: s.name,
    partyId: s.party.id,
    partyName: s.party.name,
    batha: s.batha != null ? s.batha.toNumber() : 0,
  }))

  const serialRateCards: SerialRateCard[] = rateCards.map((rc: RateCardRow) => ({
    machineId: rc.machineId,
    partyId: rc.partyId,
    siteId: rc.siteId ?? null,
    mode: rc.mode as 'bucket' | 'breaking' | null,
    rateType: rc.rateType as 'per_hour' | 'per_trip',
    rate: rc.rate.toNumber(),
  }))

  const serialStaff: SerialStaff[] = staffList.map((s: StaffRow) => ({
    id: s.id,
    name: s.name,
    roleId: s.roleId,
    defaultMachineId: s.defaultMachineId ?? null,
    defaultSiteId: s.defaultSiteId ?? null,
  }))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/jobs"
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Back to jobs"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Log Job</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <AdminJobForm
          machines={serialMachines}
          sites={serialSites}
          rateCards={serialRateCards}
          staff={serialStaff}
        />
      </div>
    </div>
  )
}
