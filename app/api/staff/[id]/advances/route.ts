import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const createAdvanceSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  accountId: z.string().min(1, 'Account is required'),
  notes: z.string().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const { id: staffId } = await params

    const staff = await prisma.user.findUnique({
      where: { id: staffId, deletedAt: null },
      select: { businessId: true },
    })
    if (!staff || staff.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const advances = await prisma.salaryAdvance.findMany({
      where: { staffId, businessId: user.businessId, deletedAt: null },
      include: { account: { select: { name: true } } },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(
      advances.map((a) => ({
        id: a.id,
        date: a.date.toISOString().split('T')[0],
        amount: a.amount.toNumber(),
        accountName: a.account.name,
        notes: a.notes,
      })),
    )
  } catch (err) {
    console.error('[GET /api/staff/[id]/advances]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const { id: staffId } = await params
    const businessId = user.businessId

    const staff = await prisma.user.findUnique({
      where: { id: staffId, deletedAt: null },
      select: { businessId: true, name: true },
    })
    if (!staff || staff.businessId !== businessId) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    const body: unknown = await request.json()
    const parsed = createAdvanceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      )
    }

    const { date, amount, accountId, notes } = parsed.data

    const account = await prisma.account.findUnique({
      where: { id: accountId, deletedAt: null },
      select: { businessId: true },
    })
    if (!account || account.businessId !== businessId) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const advance = await prisma.$transaction(async (tx) => {
      const adv = await tx.salaryAdvance.create({
        data: {
          businessId,
          staffId,
          date: new Date(date),
          amount,
          accountId,
          notes: notes ?? null,
          recordedBy: user.id,
        },
      })

      await tx.account.update({
        where: { id: accountId },
        data: { currentBalance: { decrement: amount } },
      })

      await tx.user.update({
        where: { id: staffId },
        data: { advanceBalance: { increment: amount } },
      })

      await tx.ledgerEntry.create({
        data: {
          businessId,
          date: new Date(date),
          type: 'salary_advance',
          referenceId: adv.id,
          accountId,
          staffId,
          entryType: 'debit',
          amount,
          description: `Salary advance – ${staff.name}`,
          recordedBy: user.id,
        },
      })

      return adv
    })

    return NextResponse.json({ id: advance.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/staff/[id]/advances]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
