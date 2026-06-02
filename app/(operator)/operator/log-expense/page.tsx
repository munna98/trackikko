import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OperatorExpenseForm } from '@/components/operator/operator-expense-form'
import type { SerialCategory, SerialMachine, SerialAccount } from '@/components/operator/operator-expense-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Log Expense' }

export default async function LogExpensePage() {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const businessId = user.businessId!

  const [categories, machines, accounts, dbUser] = await Promise.all([
    prisma.expenseCategory.findMany({
      where: {
        OR: [{ businessId }, { businessId: null }],
        deletedAt: null,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.machine.findMany({
      where: { businessId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.account.findMany({
      where: { businessId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { defaultAccountId: true },
    }),
  ])

  type CatRow = (typeof categories)[number]
  type MachineRow = (typeof machines)[number]
  type AccountRow = (typeof accounts)[number]

  const serialCategories: SerialCategory[] = categories.map((c: CatRow) => ({
    id: c.id,
    name: c.name,
    appliesTo: c.appliesTo as 'machine' | 'staff' | 'other' | null,
  }))

  const serialMachines: SerialMachine[] = machines.map((m: MachineRow) => ({
    id: m.id,
    name: m.name,
  }))

  const serialAccounts: SerialAccount[] = accounts.map((a: AccountRow) => ({
    id: a.id,
    name: a.name,
    type: a.type as string,
  }))

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Log Expense</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track fuel, oil, spare parts, and other operating expenses.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <OperatorExpenseForm
          categories={serialCategories}
          machines={serialMachines}
          accounts={serialAccounts}
          defaultAccountId={dbUser?.defaultAccountId}
        />
      </div>
    </div>
  )
}
