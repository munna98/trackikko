import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const editMachineSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  identifier: z.string().optional().nullable(),
  capacity: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  currentMeterReading: z.coerce.number().min(0).optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body: unknown = await request.json()
    const parsed = editMachineSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    // Cannot edit machineTypeId after creation
    const { name, identifier, capacity, isActive, currentMeterReading } = parsed.data

    // Check identifier uniqueness if changing
    if (identifier && identifier !== machine.identifier) {
      const existing = await prisma.machine.findFirst({
        where: { businessId, identifier, deletedAt: null, id: { not: id } },
      })
      if (existing) {
        return NextResponse.json({ error: 'A machine with this identifier already exists' }, { status: 409 })
      }
    }

    const updated = await prisma.machine.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(identifier !== undefined && { identifier }),
        ...(capacity !== undefined && { capacity }),
        ...(isActive !== undefined && { isActive }),
        ...(currentMeterReading !== undefined && { currentMeterReading }),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ id: updated.id })
  } catch (err) {
    console.error('[PATCH /api/machines/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
