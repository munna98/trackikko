import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ArrowLeft } from 'lucide-react'
import { AdminExpenseForm } from '@/components/expenses/admin-expense-form'
import type { SerialCategory, SerialMachine, SerialStaff, SerialAccount } from '@/components/expenses/admin-expense-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Edit Expense' }

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const businessId = user.businessId!
  const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'

  if (!isAdmin) {
    redirect('/dashboard/expenses')
  }

  const { id } = await params

  const [expense, categories, machines, staff, accounts] = await Promise.all([
    prisma.expense.findUnique({
      where: { id, businessId },
    }),
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
    prisma.user.findMany({
      where: { businessId, deletedAt: null, isActive: true, roleId: { not: 'master_admin' } },
      orderBy: { name: 'asc' },
    }),
    prisma.account.findMany({
      where: { businessId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!expense) {
    redirect('/dashboard/expenses')
  }

  type CatRow = (typeof categories)[number]
  type MachineRow = (typeof machines)[number]
  type StaffRow = (typeof staff)[number]
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

  const serialStaff: SerialStaff[] = staff.map((s: StaffRow) => ({
    id: s.id,
    name: s.name,
  }))

  const serialAccounts: SerialAccount[] = accounts.map((a: AccountRow) => ({
    id: a.id,
    name: a.name,
    type: a.type as string,
  }))

  const initialData = {
    id: expense.id,
    expenseCategoryId: expense.expenseCategoryId,
    date: expense.date.toISOString().split('T')[0],
    machineId: expense.machineId,
    staffId: expense.staffId,
    amount: expense.amount.toNumber(),
    accountId: expense.accountId,
    notes: expense.notes || '',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/expenses"
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Back to expenses"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Edit Expense</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <AdminExpenseForm
          categories={serialCategories}
          machines={serialMachines}
          staffList={serialStaff}
          accounts={serialAccounts}
          initialData={initialData}
        />
      </div>
    </div>
  )
}
