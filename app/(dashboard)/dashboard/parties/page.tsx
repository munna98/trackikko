import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/page-header'
import { PartiesListClient } from '@/components/parties/parties-list-client'
import { PartySheet } from '@/components/parties/party-sheet'
import { EmptyState } from '@/components/ui/empty-state'
import { Building2 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Parties & Sites' }

export default async function PartiesPage() {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const businessId = user.businessId!
  const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'

  const parties = await prisma.party.findMany({
    where: { businessId, deletedAt: null },
    include: {
      _count: { select: { sites: { where: { deletedAt: null } } } },
    },
    orderBy: { name: 'asc' },
  })

  type PartyRow = (typeof parties)[number]
  const serialised = parties.map((p: PartyRow) => ({
    id: p.id,
    name: p.name,
    mobile: p.mobile ?? undefined,
    address: p.address ?? undefined,
    gstNo: p.gstNo ?? undefined,
    openingBalance: p.openingBalance.toNumber(),
    runningBalance: p.runningBalance.toNumber(),
    isActive: p.isActive,
    siteCount: p._count.sites,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parties & Sites"
        description="Manage clients, contractors, and their project sites."
        action={isAdmin ? <PartySheet /> : undefined}
      />

      {parties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No parties added yet"
          description="Add your first party to start tracking billing and sites."
          action={isAdmin ? <PartySheet /> : undefined}
        />
      ) : (
        <PartiesListClient parties={serialised} isAdmin={isAdmin} />
      )}
    </div>
  )
}
