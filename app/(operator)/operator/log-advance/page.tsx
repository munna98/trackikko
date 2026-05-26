import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OperatorAdvanceForm } from '@/components/operator/operator-advance-form'
import type { SerialParty, SerialAccount } from '@/components/operator/operator-advance-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Log Advance' }

export default async function LogAdvancePage() {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const businessId = user.businessId!

  const [parties, accounts] = await Promise.all([
    prisma.party.findMany({
      where: { businessId, deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.account.findMany({
      where: { businessId, deletedAt: null, isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    }),
  ])

  type PartyRow = (typeof parties)[number]
  type AccountRow = (typeof accounts)[number]

  const serialParties: SerialParty[] = parties.map((p: PartyRow) => ({
    id: p.id,
    name: p.name,
  }))

  const serialAccounts: SerialAccount[] = accounts.map((a: AccountRow) => ({
    id: a.id,
    name: a.name,
    type: a.type as string,
  }))

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Log Advance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record a party advance collected on site.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <OperatorAdvanceForm
          parties={serialParties}
          accounts={serialAccounts}
        />
      </div>
    </div>
  )
}
