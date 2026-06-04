import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExpensesListClient } from '@/components/expenses/expenses-list-client'
import type { ExpenseRow, FilterOption } from '@/components/expenses/expenses-list-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Expenses' }

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ExpensesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const businessId = user.businessId!
  const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'

  const resolvedParams = await searchParams
  const categoryId = typeof resolvedParams.categoryId === 'string' ? resolvedParams.categoryId : undefined
  const machineId = typeof resolvedParams.machineId === 'string' ? resolvedParams.machineId : undefined
  const staffId = typeof resolvedParams.staffId === 'string' ? resolvedParams.staffId : undefined
  const from = typeof resolvedParams.from === 'string' ? resolvedParams.from : undefined
  const to = typeof resolvedParams.to === 'string' ? resolvedParams.to : undefined
  const status = typeof resolvedParams.status === 'string' ? resolvedParams.status : undefined

  const [expenses, categories, machines, staff] = await Promise.all([
    prisma.expense.findMany({
      where: {
        businessId,
        deletedAt: null,
        ...(categoryId && { expenseCategoryId: categoryId }),
        ...(machineId && { machineId }),
        ...(staffId && { staffId }),
        ...(from && to && {
          date: {
            gte: new Date(from),
            lte: new Date(to),
          }
        }),
        ...(status === 'reviewed' && { isReviewed: true }),
        ...(status === 'unreviewed' && { isReviewed: false }),
        ...(!isAdmin && { recordedBy: user.id }),
      },
      include: {
        expenseCategory: { select: { name: true } },
        machine: { select: { name: true } },
        staff: { select: { name: true } },
        account: { select: { name: true } },
        recorder: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 50,
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
  ])

  type ExpRow = (typeof expenses)[number]
  const serialExpenses: ExpenseRow[] = expenses.map((e: ExpRow) => ({
    id: e.id,
    date: e.date.toISOString().split('T')[0],
    amount: e.amount.toNumber(),
    categoryId: e.expenseCategoryId,
    categoryName: e.expenseCategory.name,
    machineId: e.machineId,
    machineName: e.machine?.name ?? null,
    staffId: e.staffId,
    staffName: e.staff?.name ?? null,
    accountId: e.accountId,
    accountName: e.account.name,
    notes: e.notes,
    recordedBy: e.recordedBy,
    recorderName: e.recorder?.name ?? null,
    isReviewed: e.isReviewed,
  }))

  const catOptions: FilterOption[] = categories.map(c => ({ id: c.id, name: c.name }))
  const machineOptions: FilterOption[] = machines.map(m => ({ id: m.id, name: m.name }))
  const staffOptions: FilterOption[] = staff.map(s => ({ id: s.id, name: s.name }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track fuel, oil, spare parts, and other operating expenses.
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/expenses/new">
            <Button id="log-expense-btn">
              <Plus className="mr-2 h-4 w-4" />
              Log Expense
            </Button>
          </Link>
        )}
      </div>

      <ExpensesListClient
        expenses={serialExpenses}
        categories={catOptions}
        machines={machineOptions}
        staffList={staffOptions}
        currentCategoryId={categoryId}
        currentMachineId={machineId}
        currentStaffId={staffId}
        currentFrom={from}
        currentTo={to}
        currentStatus={status}
        isAdmin={isAdmin}
      />
    </div>
  )
}
