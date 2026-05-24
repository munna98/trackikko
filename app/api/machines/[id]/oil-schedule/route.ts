import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const oilScheduleSchema = z.object({
  intervalUnits: z.coerce.number().positive('Interval must be positive'),
  alertBeforeUnits: z.coerce.number().min(0).default(20),
  lastChangedAtReading: z.coerce.number().min(0),
  lastChangedDate: z.string().min(1, 'Date is required'),
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
    const parsed = oilScheduleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const { intervalUnits, alertBeforeUnits, lastChangedAtReading, lastChangedDate, notes } = parsed.data

    const schedule = await prisma.oilChangeSchedule.upsert({
      where: { machineId: id },
      create: {
        businessId,
        machineId: id,
        intervalUnits,
        alertBeforeUnits,
        lastChangedAtReading,
        lastChangedDate: new Date(lastChangedDate),
        notes: notes || null,
      },
      update: {
        intervalUnits,
        alertBeforeUnits,
        lastChangedAtReading,
        lastChangedDate: new Date(lastChangedDate),
        notes: notes || null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ id: schedule.id })
  } catch (err) {
    console.error('[POST /api/machines/[id]/oil-schedule]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
