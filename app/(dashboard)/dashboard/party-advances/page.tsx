import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PartyAdvancesListClient } from '@/components/advances/party-advances-list-client'
import { GlobalPartyAdvanceDialog } from '@/components/advances/global-party-advance-dialog'
import type { PartyAdvanceRow } from '@/components/advances/party-advances-list-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Party Advances' }

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PartyAdvancesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const businessId = user.businessId!
  const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'

  const resolvedParams = await searchParams
  const partyId = typeof resolvedParams.partyId === 'string' ? resolvedParams.partyId : undefined
  const from = typeof resolvedParams.from === 'string' ? resolvedParams.from : undefined
  const to = typeof resolvedParams.to === 'string' ? resolvedParams.to : undefined
  const status = typeof resolvedParams.status === 'string' ? resolvedParams.status : undefined

  const [advances, parties, accounts] = await Promise.all([
    prisma.partyAdvance.findMany({
      where: {
        businessId,
        deletedAt: null,
        ...(partyId && { partyId }),
        ...(from && to && {
          date: {
            gte: new Date(from),
            lte: new Date(to),
          },
        }),
        ...(status === 'reviewed' && { isReviewed: true }),
        ...(status === 'unreviewed' && { isReviewed: false }),
      },
      include: {
        party: { select: { name: true } },
        account: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    }),
    prisma.party.findMany({
      where: { businessId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.account.findMany({
      where: { businessId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true },
    }),
  ])

  type AdvRow = (typeof advances)[number]
  const serialAdvances: PartyAdvanceRow[] = advances.map((a: AdvRow) => ({
    id: a.id,
    date: a.date.toISOString().split('T')[0],
    partyId: a.partyId,
    partyName: a.party.name,
    amount: a.amount.toNumber(),
    accountName: a.account.name,
    notes: a.notes,
    isReviewed: a.isReviewed,
  }))

  const partyOptions = parties.map((p) => ({ id: p.id, name: p.name }))
  const accountOptions = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type as string,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Party Advances</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track all advances received from parties across your business.
          </p>
        </div>
        {isAdmin && (
          <GlobalPartyAdvanceDialog
            parties={partyOptions}
            accounts={accountOptions}
          />
        )}
      </div>

      <PartyAdvancesListClient
        advances={serialAdvances}
        parties={partyOptions}
        accounts={accountOptions}
        currentPartyId={partyId}
        currentFrom={from}
        currentTo={to}
        currentStatus={status}
        isAdmin={isAdmin}
      />
    </div>
  )
}
