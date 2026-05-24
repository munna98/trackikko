import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { PartySheet } from '@/components/parties/party-sheet'
import { PartyTabs } from '@/components/parties/party-tabs'
import { ChevronLeft, Phone, MapPin } from 'lucide-react'
import { formatINR } from '@/lib/utils'
import type { Metadata } from 'next'

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const party = await prisma.party.findUnique({ where: { id }, select: { name: true } })
  return { title: party?.name ?? 'Party' }
}

export default async function PartyDetailPage({ params }: PageProps) {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const { id } = await params
  const businessId = user.businessId!
  const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'

  const [party, machines] = await Promise.all([
    prisma.party.findUnique({
      where: { id, deletedAt: null },
      include: {
        sites: { where: { deletedAt: null }, orderBy: { name: 'asc' } },
        rateCards: {
          where: { deletedAt: null },
          include: {
            machine: { include: { machineType: true } },
            site: true,
          },
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    }),
    prisma.machine.findMany({
      where: { businessId, deletedAt: null, isActive: true },
      include: { machineType: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!party || party.businessId !== businessId) notFound()

  const runningBalance = party.runningBalance.toNumber()

  type SiteRow = (typeof party.sites)[number]
  type RcRow = (typeof party.rateCards)[number]
  type MachineRow = (typeof machines)[number]

  const serialisedSites = party.sites.map((s: SiteRow) => ({
    id: s.id,
    name: s.name,
    location: s.location ?? undefined,
    isActive: s.isActive,
  }))

  const serialisedRateCards = party.rateCards.map((rc: RcRow) => ({
    id: rc.id,
    machineName: rc.machine.name,
    siteName: rc.site?.name ?? null,
    mode: rc.mode,
    rateType: rc.rateType,
    rate: rc.rate.toNumber(),
    effectiveFrom: rc.effectiveFrom.toISOString(),
    isActive: rc.isActive,
  }))

  const serialisedMachines = machines.map((m: MachineRow) => ({
    id: m.id,
    name: m.name,
    trackingUnit: m.machineType.trackingUnit as 'hours' | 'trips' | 'km',
    hasModes: m.machineType.hasModes,
  }))

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/parties"
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Back to parties"
      >
        <ChevronLeft className="h-6 w-6 inline" />
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{party.name}</h1>
            {!party.isActive && (
              <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
            )}
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {party.mobile && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />{party.mobile}
              </span>
            )}
            {party.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />{party.address}
              </span>
            )}
            {party.gstNo && <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{party.gstNo}</span>}
          </div>

          {/* Balance */}
          <div className="mt-2">
            {runningBalance === 0 ? (
              <p className="text-lg font-semibold text-muted-foreground">Settled</p>
            ) : runningBalance > 0 ? (
              <p className="text-2xl font-bold text-destructive">
                {formatINR(runningBalance)} <span className="text-sm font-normal">Dr — they owe us</span>
              </p>
            ) : (
              <p className="text-2xl font-bold text-amber-500">
                {formatINR(Math.abs(runningBalance))} <span className="text-sm font-normal">Cr — we owe them</span>
              </p>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <PartySheet
              defaultValues={{
                id: party.id,
                name: party.name,
                mobile: party.mobile ?? undefined,
                address: party.address ?? undefined,
                gstNo: party.gstNo ?? undefined,
                openingBalance: party.openingBalance.toNumber(),
                runningBalance: party.runningBalance.toNumber(),
              }}
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <PartyTabs
        partyId={party.id}
        sites={serialisedSites}
        rateCards={serialisedRateCards}
        machines={serialisedMachines}
        isAdmin={isAdmin}
      />
    </div>
  )
}
