import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OperatorJobForm } from '@/components/jobs/operator-job-form'
import type {
  SerialMachine,
  SerialSite,
  SerialRateCard,
} from '@/components/jobs/operator-job-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Log Job' }

export default async function LogJobPage() {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const businessId = user.businessId!

  const [machines, sites, rateCards] = await Promise.all([
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
  ])

  type MachineRow = (typeof machines)[number]
  type SiteRow = (typeof sites)[number]
  type RateCardRow = (typeof rateCards)[number]

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

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Log Job</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record today&apos;s machine work.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <OperatorJobForm
          machines={serialMachines}
          sites={serialSites}
          rateCards={serialRateCards}
        />
      </div>
    </div>
  )
}
