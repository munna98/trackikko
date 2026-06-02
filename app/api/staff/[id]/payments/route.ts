import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const createPaymentSchema = z.object({
  periodFrom: z.string().min(1, 'Period from is required'),
  periodTo: z.string().min(1, 'Period to is required'),
  daysWorked: z.coerce.number().int().min(0, 'Days worked must be ≥ 0'),
  bathaTotal: z.coerce.number().min(0).default(0),
  bathaJobIds: z.array(z.string()).default([]),
  salary: z.coerce.number().positive('Salary must be positive'),
  advancesDeducted: z.coerce.number().min(0).default(0),
  netPaid: z.coerce.number().min(0, 'Net paid must be ≥ 0'),
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
      select: { businessId: true, advanceBalance: true },
    })
    if (!staff || staff.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    // Suggest mode: return unpaid batha jobs + advance balance
    if (from && to) {
      const [allUnpaidJobs, jobsInPeriod] = await Promise.all([
        // All unpaid batha jobs (any date) for this staff
        prisma.job.findMany({
          where: {
            staffId,
            businessId: user.businessId,
            deletedAt: null,
            bathaPaidBy: 'company',
            bathaPaid: false,
          },
          include: { site: { select: { name: true } } },
          orderBy: { date: 'asc' },
        }),
        // Jobs in period (for daysWorked count)
        prisma.job.findMany({
          where: {
            staffId,
            businessId: user.businessId,
            deletedAt: null,
            date: { gte: new Date(from), lte: new Date(to) },
          },
          select: { id: true },
        }),
      ])

      const periodJobIds = new Set(jobsInPeriod.map((j) => j.id))

      return NextResponse.json({
        unpaidBathaJobs: allUnpaidJobs.map((j) => ({
          id: j.id,
          date: j.date.toISOString().split('T')[0],
          siteName: j.site.name,
          batha: j.batha.toNumber(),
          inPeriod: periodJobIds.has(j.id),
        })),
        advancesDeducted: staff.advanceBalance.toNumber(),
        jobCount: jobsInPeriod.length,
      })
    }

    // Normal list
    const payments = await prisma.staffPayment.findMany({
      where: { staffId, businessId: user.businessId, deletedAt: null },
      include: { account: { select: { name: true } } },
      orderBy: { periodTo: 'desc' },
    })

    return NextResponse.json(
      payments.map((p) => ({
        id: p.id,
        periodFrom: p.periodFrom.toISOString().split('T')[0],
        periodTo: p.periodTo.toISOString().split('T')[0],
        daysWorked: p.daysWorked,
        bathaTotal: p.bathaTotal?.toNumber() ?? 0,
        salary: p.salary.toNumber(),
        advancesDeducted: p.advancesDeducted?.toNumber() ?? 0,
        netPaid: p.netPaid.toNumber(),
        accountName: p.account.name,
        notes: p.notes,
      })),
    )
  } catch (err) {
    console.error('[GET /api/staff/[id]/payments]', err)
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
      select: { businessId: true, name: true, advanceBalance: true },
    })
    if (!staff || staff.businessId !== businessId) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    const body: unknown = await request.json()
    const parsed = createPaymentSchema.safeParse(body)
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
      bathaJobIds,
      salary,
      advancesDeducted,
      netPaid,
      accountId,
      notes,
    } = parsed.data

    const account = await prisma.account.findUnique({
      where: { id: accountId, deletedAt: null },
      select: { businessId: true },
    })
    if (!account || account.businessId !== businessId) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const payment = await prisma.$transaction(async (tx) => {
      const pay = await tx.staffPayment.create({
        data: {
          businessId,
          staffId,
          periodFrom: new Date(periodFrom),
          periodTo: new Date(periodTo),
          daysWorked,
          bathaTotal,
          salary,
          advancesDeducted,
          netPaid,
          accountId,
          notes: notes ?? null,
          recordedBy: user.id,
        },
      })

      // Mark selected jobs' batha as paid and link to this payment
      if (bathaJobIds.length > 0) {
        await tx.job.updateMany({
          where: {
            id: { in: bathaJobIds },
            staffId,
            businessId,
            bathaPaidBy: 'company',
            bathaPaid: false,
          },
          data: {
            bathaPaid: true,
            bathaPaymentId: pay.id,
          },
        })
      }

      // Deduct net paid from account
      await tx.account.update({
        where: { id: accountId },
        data: { currentBalance: { decrement: netPaid } },
      })

      // Reduce advance balance by deducted amount (floor at 0)
      if (advancesDeducted > 0) {
        const currentAdv = staff.advanceBalance.toNumber()
        const newAdv = Math.max(0, currentAdv - advancesDeducted)
        await tx.user.update({
          where: { id: staffId },
          data: { advanceBalance: newAdv },
        })
      }

      await tx.ledgerEntry.create({
        data: {
          businessId,
          date: new Date(periodTo),
          type: 'staff_payment',
          referenceId: pay.id,
          accountId,
          staffId,
          entryType: 'debit',
          amount: netPaid,
          description: `Staff payment – ${staff.name}`,
          recordedBy: user.id,
        },
      })

      return pay
    })

    return NextResponse.json({ id: payment.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/staff/[id]/payments]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
