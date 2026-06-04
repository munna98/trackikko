import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const updatePaymentSchema = z.object({
  periodFrom: z.string().min(1, 'Period from is required'),
  periodTo: z.string().min(1, 'Period to is required'),
  daysWorked: z.coerce.number().int().min(0, 'Days worked must be ≥ 0'),
  bathaTotal: z.coerce.number().min(0).default(0),
  salary: z.coerce.number().positive('Salary must be positive'),
  advancesDeducted: z.coerce.number().min(0).default(0),
  netPaid: z.coerce.number().min(0, 'Net paid must be ≥ 0'),
  accountId: z.string().min(1, 'Account is required'),
  notes: z.string().optional().nullable(),
})

type RouteParams = { params: Promise<{ id: string; paymentId: string }> }

// GET a single payment (for edit pre-fill)
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const { id: staffId, paymentId } = await params

    const payment = await prisma.staffPayment.findUnique({
      where: { id: paymentId, deletedAt: null },
      include: { account: { select: { name: true } } },
    })

    if (!payment || payment.staffId !== staffId || payment.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: payment.id,
      periodFrom: payment.periodFrom.toISOString().split('T')[0],
      periodTo: payment.periodTo.toISOString().split('T')[0],
      daysWorked: payment.daysWorked,
      bathaTotal: payment.bathaTotal?.toNumber() ?? 0,
      salary: payment.salary.toNumber(),
      advancesDeducted: payment.advancesDeducted?.toNumber() ?? 0,
      netPaid: payment.netPaid.toNumber(),
      accountId: payment.accountId,
      accountName: payment.account.name,
      notes: payment.notes,
    })
  } catch (err) {
    console.error('[GET /api/staff/[id]/payments/[paymentId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: update a payment
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const { id: staffId, paymentId } = await params
    const businessId = user.businessId

    // Fetch existing payment
    const existing = await prisma.staffPayment.findUnique({
      where: { id: paymentId, deletedAt: null },
    })
    if (!existing || existing.staffId !== staffId || existing.businessId !== businessId) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const body: unknown = await request.json()
    const parsed = updatePaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      )
    }

    const {
      periodFrom,
      periodTo,
      daysWorked,
      bathaTotal,
      salary,
      advancesDeducted,
      netPaid,
      accountId,
      notes,
    } = parsed.data

    // Validate new account belongs to this business
    const newAccount = await prisma.account.findUnique({
      where: { id: accountId, deletedAt: null },
      select: { businessId: true },
    })
    if (!newAccount || newAccount.businessId !== businessId) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const oldNetPaid = existing.netPaid.toNumber()
    const oldAccountId = existing.accountId
    const oldAdvancesDeducted = existing.advancesDeducted?.toNumber() ?? 0

    await prisma.$transaction(async (tx) => {
      // Update the payment record
      await tx.staffPayment.update({
        where: { id: paymentId },
        data: {
          periodFrom: new Date(periodFrom),
          periodTo: new Date(periodTo),
          daysWorked,
          bathaTotal,
          salary,
          advancesDeducted,
          netPaid,
          accountId,
          notes: notes ?? null,
        },
      })

      // Reverse old account debit, apply new debit
      if (oldAccountId === accountId) {
        // Same account: adjust by the difference
        const diff = netPaid - oldNetPaid
        if (diff !== 0) {
          await tx.account.update({
            where: { id: accountId },
            data: { currentBalance: { decrement: diff } },
          })
        }
      } else {
        // Different accounts: refund old, charge new
        await tx.account.update({
          where: { id: oldAccountId },
          data: { currentBalance: { increment: oldNetPaid } },
        })
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { decrement: netPaid } },
        })
      }

      // Adjust staff advance balance: reverse old deduction, apply new
      const advDiff = advancesDeducted - oldAdvancesDeducted
      if (advDiff !== 0) {
        const staff = await tx.user.findUnique({
          where: { id: staffId },
          select: { advanceBalance: true },
        })
        if (staff) {
          const currentAdv = staff.advanceBalance.toNumber()
          // If we deducted more, balance goes down further; if less, it goes up
          const newAdv = Math.max(0, currentAdv - advDiff)
          await tx.user.update({
            where: { id: staffId },
            data: { advanceBalance: newAdv },
          })
        }
      }

      // Update ledger entry
      await tx.ledgerEntry.updateMany({
        where: { referenceId: paymentId, type: 'staff_payment' },
        data: {
          date: new Date(periodTo),
          accountId,
          amount: netPaid,
        },
      })
    })

    return NextResponse.json({ id: paymentId })
  } catch (err) {
    console.error('[PATCH /api/staff/[id]/payments/[paymentId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: soft-delete a payment
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const { id: staffId, paymentId } = await params
    const businessId = user.businessId

    const existing = await prisma.staffPayment.findUnique({
      where: { id: paymentId, deletedAt: null },
    })
    if (!existing || existing.staffId !== staffId || existing.businessId !== businessId) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const oldNetPaid = existing.netPaid.toNumber()
    const oldAdvancesDeducted = existing.advancesDeducted?.toNumber() ?? 0

    await prisma.$transaction(async (tx) => {
      // Soft-delete the payment
      await tx.staffPayment.update({
        where: { id: paymentId },
        data: { deletedAt: new Date(), deletedBy: user.id },
      })

      // Unmark any batha jobs linked to this payment
      await tx.job.updateMany({
        where: { bathaPaymentId: paymentId },
        data: { bathaPaid: false, bathaPaymentId: null },
      })

      // Refund the account
      await tx.account.update({
        where: { id: existing.accountId },
        data: { currentBalance: { increment: oldNetPaid } },
      })

      // Restore staff advance balance
      if (oldAdvancesDeducted > 0) {
        await tx.user.update({
          where: { id: staffId },
          data: { advanceBalance: { increment: oldAdvancesDeducted } },
        })
      }

      // Soft-delete ledger entry
      await tx.ledgerEntry.deleteMany({
        where: { referenceId: paymentId, type: 'staff_payment' },
      })
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/staff/[id]/payments/[paymentId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
