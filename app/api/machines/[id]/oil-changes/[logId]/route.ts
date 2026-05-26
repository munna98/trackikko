import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const editOilChangeSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  readingAtChange: z.coerce.number().min(0),
  oilType: z.string().optional(),
  cost: z.coerce.number().min(0).optional(),
  accountId: z.string().optional().nullable(),
  notes: z.string().optional(),
})

type RouteParams = { params: Promise<{ id: string; logId: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const { id, logId } = await params
    const businessId = user.businessId

    const machine = await prisma.machine.findUnique({ where: { id, businessId, deletedAt: null } })
    if (!machine) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    }

    const existingLog = await prisma.oilChangeLog.findUnique({
      where: { id: logId, machineId: id, businessId, deletedAt: null },
    })
    if (!existingLog) {
      return NextResponse.json({ error: 'Oil change log not found' }, { status: 404 })
    }

    const body: unknown = await request.json()
    const parsed = editOilChangeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const { date, readingAtChange, oilType, cost, accountId, notes } = parsed.data

    const updatedLog = await prisma.$transaction(async (tx) => {
      // 1. Update the log itself
      const log = await tx.oilChangeLog.update({
        where: { id: logId },
        data: {
          date: new Date(date),
          readingAtChange,
          oilType: oilType || null,
          cost: cost ?? null,
          accountId: accountId || null,
          notes: notes || null,
        },
      })

      // 2. Check if this log is the LATEST log for this machine (by reading or date)
      const latestLog = await tx.oilChangeLog.findFirst({
        where: { machineId: id, deletedAt: null },
        orderBy: [{ readingAtChange: 'desc' }, { date: 'desc' }],
      })

      // If the log we just edited is now the latest log, or the latest log has changed, we sync the schedule
      if (latestLog && latestLog.id === logId) {
        await tx.oilChangeSchedule.updateMany({
          where: { machineId: id },
          data: {
            lastChangedAtReading: latestLog.readingAtChange,
            lastChangedDate: latestLog.date,
            updatedAt: new Date(),
          },
        })

        // Also update machine's currentMeterReading if it is smaller
        if (latestLog.readingAtChange.toNumber() > machine.currentMeterReading.toNumber()) {
          await tx.machine.update({
            where: { id },
            data: { currentMeterReading: latestLog.readingAtChange },
          })
        }
      }

      return log
    })

    return NextResponse.json({ id: updatedLog.id })
  } catch (err) {
    console.error('[PATCH /api/machines/[id]/oil-changes/[logId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
