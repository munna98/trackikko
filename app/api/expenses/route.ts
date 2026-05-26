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

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const body = await request.json()
    const parsed = expenseSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    let { expenseCategoryId, date, machineId, staffId, amount, accountId, notes } = parsed.data

    // Operators automatically have their expenses assigned to themselves
    const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'
    if (!isAdmin) {
      staffId = user.id
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

      // 1. Create Expense row
      const expense = await tx.expense.create({
        data: {
          businessId: user.businessId!,
          expenseCategoryId,
          date: expenseDate,
          machineId,
          staffId,
          amount,
          accountId,
          notes,
          recordedBy: user.id,
        },
      })

      // 2. Decrement account.currentBalance by amount
      await tx.account.update({
        where: { id: accountId },
        data: { currentBalance: { decrement: amount } },
      })

      // 3. Create LedgerEntry
      await tx.ledgerEntry.create({
        data: {
          businessId: user.businessId!,
          date: expenseDate,
          type: 'expense',
          referenceId: expense.id,
          accountId,
          machineId,
          staffId,
          entryType: 'debit',
          amount,
          recordedBy: user.id,
          description: notes ?? `Expense logged`,
        },
      })

      return expense
    })

    return NextResponse.json({ id: result.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/expenses]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const machineId = searchParams.get('machineId')
    const staffId = searchParams.get('staffId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const expenses = await prisma.expense.findMany({
      where: {
        businessId: user.businessId,
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
        // Operators only see their own
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
    })

    const serialized = expenses.map(e => ({
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
    }))

    return NextResponse.json(serialized)
  } catch (err) {
    console.error('[GET /api/expenses]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
