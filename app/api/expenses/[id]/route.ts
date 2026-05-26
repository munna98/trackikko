import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const expenseSchema = z.object({
  expenseCategoryId: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
  machineId: z.string().optional().nullable(),
  staffId: z.string().optional().nullable(),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  accountId: z.string().min(1, "Account is required"),
  notes: z.string().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can edit expenses' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = expenseSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const { expenseCategoryId, date, machineId, staffId, amount, accountId, notes } = parsed.data

    const oldExpense = await prisma.expense.findUnique({
      where: { id, businessId: user.businessId },
    })

    if (!oldExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // Validation checks for ownership
    const account = await prisma.account.findUnique({
      where: { id: accountId, deletedAt: null },
      select: { businessId: true },
    })

    if (!account || account.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (machineId) {
      const machine = await prisma.machine.findUnique({
        where: { id: machineId, deletedAt: null },
        select: { businessId: true },
      })
      if (!machine || machine.businessId !== user.businessId) {
        return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const expenseDate = new Date(date)

      // 1. Revert old account balance
      await tx.account.update({
        where: { id: oldExpense.accountId },
        data: { currentBalance: { increment: oldExpense.amount } },
      })

      // 2. Apply new account balance
      await tx.account.update({
        where: { id: accountId },
        data: { currentBalance: { decrement: amount } },
      })

      // 3. Update Expense row
      const expense = await tx.expense.update({
        where: { id },
        data: {
          expenseCategoryId,
          date: expenseDate,
          machineId,
          staffId,
          amount,
          accountId,
          notes,
        },
      })

      // 4. Update LedgerEntry
      const ledgerEntry = await tx.ledgerEntry.findFirst({
        where: { referenceId: id, type: 'expense' }
      })

      if (ledgerEntry) {
        await tx.ledgerEntry.update({
          where: { id: ledgerEntry.id },
          data: {
            date: expenseDate,
            accountId,
            machineId,
            staffId,
            amount,
            description: notes ?? `Expense logged`,
          },
        })
      }

      return expense
    })

    return NextResponse.json({ id: result.id })
  } catch (err) {
    console.error('[PUT /api/expenses/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
