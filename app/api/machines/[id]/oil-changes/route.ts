import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const oilChangeSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  readingAtChange: z.coerce.number().min(0),
  oilType: z.string().optional(),
  cost: z.coerce.number().min(0).optional(),
  accountId: z.string().optional().nullable(),
  notes: z.string().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const { id } = await params
    const businessId = user.businessId

    const machine = await prisma.machine.findUnique({ where: { id, deletedAt: null } })
    if (!machine || machine.businessId !== businessId) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    }

    const body: unknown = await request.json()
    const parsed = oilChangeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const { date, readingAtChange, oilType, cost, accountId, notes } = parsed.data

    // Insert log + update schedule & machine reading in a single transaction
    const log = await prisma.$transaction(async (tx) => {
      const log = await tx.oilChangeLog.create({
        data: {
          businessId,
          machineId: id,
          date: new Date(date),
          readingAtChange,
          oilType: oilType || null,
          cost: cost ?? null,
          accountId: accountId || null,
          notes: notes || null,
          recordedBy: user.id,
        },
      })

      // Update oil change schedule if one exists
      await tx.oilChangeSchedule.updateMany({
        where: { machineId: id },
        data: {
          lastChangedAtReading: readingAtChange,
          lastChangedDate: new Date(date),
          updatedAt: new Date(),
        },
      })

      // Update machine meter reading if the new reading is higher
      if (readingAtChange > machine.currentMeterReading.toNumber()) {
        await tx.machine.update({
          where: { id },
          data: { currentMeterReading: readingAtChange },
        })
      }

      return log
    })

    return NextResponse.json({ id: log.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/machines/[id]/oil-changes]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
