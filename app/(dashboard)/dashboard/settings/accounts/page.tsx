import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/page-header'
import { AccountDialog } from '@/components/settings/account-dialog'
import type { Metadata } from 'next'
import { AccountsClient } from '@/components/settings/accounts-client'

export const metadata: Metadata = { title: 'Accounts' }

export default async function AccountsPage() {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const businessId = user.businessId!
  const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'

  const accounts = await prisma.account.findMany({
    where: { businessId, deletedAt: null },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })

  type AccountRow = (typeof accounts)[number]
  const serialised = accounts.map((a: AccountRow) => ({
    id: a.id,
    name: a.name,
    type: a.type as 'cash' | 'bank',
    openingBalance: a.openingBalance.toNumber(),
    currentBalance: a.currentBalance.toNumber(),
    isActive: a.isActive,
  }))

  type SerialisedAccount = (typeof serialised)[number]
  const cash = serialised.filter((a: SerialisedAccount) => a.type === 'cash')
  const bank = serialised.filter((a: SerialisedAccount) => a.type === 'bank')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Manage cash and bank accounts."
        action={isAdmin ? <AccountDialog /> : undefined}
      />
      <AccountsClient accounts={serialised} isAdmin={isAdmin} cash={cash} bank={bank} />
    </div>
  )
}
