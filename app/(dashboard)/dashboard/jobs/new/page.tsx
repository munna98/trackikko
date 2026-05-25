import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { AdminJobForm } from '@/components/jobs/admin-job-form'
import type { SerialMachine, SerialSite, SerialRateCard } from '@/components/jobs/operator-job-form'
import type { SerialStaff } from '@/components/jobs/admin-job-form'
import { ArrowLeft } from 'lucide-react'
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
      select: { id: true, name: true, roleId: true },
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
  }))

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Log Job"
        description="Record a job entry on behalf of a staff member."
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard/jobs">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Jobs
            </Link>
          </Button>
        }
      />

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
