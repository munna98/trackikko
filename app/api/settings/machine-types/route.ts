import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const createMachineTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  trackingUnit: z.enum(['hours', 'trips', 'km']),
  hasModes: z.boolean().default(false),
  isBillable: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const body: unknown = await request.json()
    const parsed = createMachineTypeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const machineType = await prisma.machineType.create({
      data: {
        businessId: user.businessId,
        name: parsed.data.name,
        trackingUnit: parsed.data.trackingUnit,
        hasModes: parsed.data.hasModes,
        isBillable: parsed.data.isBillable,
      },
    })

    return NextResponse.json({ id: machineType.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/settings/machine-types]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
