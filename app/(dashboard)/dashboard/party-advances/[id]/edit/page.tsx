import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ArrowLeft } from 'lucide-react'
import { AdminPartyAdvanceForm } from '@/components/advances/admin-party-advance-form'
import type { SerialParty, SerialAccount } from '@/components/advances/admin-party-advance-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Edit Party Advance' }

export default async function EditPartyAdvancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const businessId = user.businessId!
  const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'

  if (!isAdmin) {
    redirect('/dashboard/party-advances')
  }

  const { id } = await params

  const [advance, parties, accounts] = await Promise.all([
    prisma.partyAdvance.findUnique({
      where: { id, businessId },
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

  if (!advance) {
    redirect('/dashboard/party-advances')
  }

  const serialParties: SerialParty[] = parties.map((p) => ({
    id: p.id,
    name: p.name,
  }))

  const serialAccounts: SerialAccount[] = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type as string,
  }))

  const initialData = {
    id: advance.id,
    partyId: advance.partyId,
    date: advance.date.toISOString().split('T')[0],
    amount: advance.amount.toNumber(),
    accountId: advance.accountId,
    notes: advance.notes || '',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/party-advances"
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Back to advances"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Edit Party Advance</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <AdminPartyAdvanceForm
          parties={serialParties}
          accounts={serialAccounts}
          initialData={initialData}
        />
      </div>
    </div>
  )
}
