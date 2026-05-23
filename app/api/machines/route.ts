import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const createMachineSchema = z.object({
  machineTypeId: z.string().min(1, 'Select a machine type'),
  name: z.string().min(1, 'Name is required'),
  identifier: z.string().optional(),
  capacity: z.string().optional(),
  currentMeterReading: z.coerce.number().min(0),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const body: unknown = await request.json()
    const parsed = createMachineSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { machineTypeId, name, identifier, capacity, currentMeterReading } = parsed.data
    const businessId = user.businessId

    // Check identifier uniqueness within business (if provided)
    if (identifier) {
      const existing = await prisma.machine.findFirst({
        where: { businessId, identifier, deletedAt: null },
      })
      if (existing) {
        return NextResponse.json({ error: 'A machine with this identifier already exists' }, { status: 409 })
      }
    }

    const machine = await prisma.machine.create({
      data: {
        businessId,
        machineTypeId,
        name,
        identifier: identifier || null,
        capacity: capacity || null,
        currentMeterReading,
      },
    })

    return NextResponse.json({ id: machine.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/machines]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
