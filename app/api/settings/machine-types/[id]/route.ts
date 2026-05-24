import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const updateMachineTypeSchema = z.object({
  name: z.string().min(1).optional(),
  trackingUnit: z.enum(['hours', 'trips', 'km']).optional(),
  hasModes: z.boolean().optional(),
  isBillable: z.boolean().optional(),
  isActive: z.boolean().optional(),
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

    const machineType = await prisma.machineType.findUnique({
      where: { id, deletedAt: null },
      select: { businessId: true },
    })
    if (!machineType) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Cannot edit global types
    if (machineType.businessId === null) {
      return NextResponse.json({ error: 'Cannot edit global machine types' }, { status: 403 })
    }
    if (machineType.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body: unknown = await request.json()
    const parsed = updateMachineTypeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { name, trackingUnit, hasModes, isBillable, isActive } = parsed.data

    await prisma.machineType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(trackingUnit !== undefined && { trackingUnit }),
        ...(hasModes !== undefined && { hasModes }),
        ...(isBillable !== undefined && { isBillable }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/settings/machine-types/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
