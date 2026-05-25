import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const patchJobSchema = z.object({
  actualRate: z.coerce.number().min(0).optional(),
  batha: z.coerce.number().min(0).optional(),
  date: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const { id } = await params

    const body: unknown = await request.json()
    const parsed = patchJobSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { actualRate, batha, date } = parsed.data

    const existing = await prisma.job.findFirst({
      where: { id, businessId: user.businessId, deletedAt: null },
    })
    if (!existing) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    // Recompute amount if actualRate changes
    const newActualRate = actualRate ?? existing.actualRate.toNumber()
    const amount = existing.quantity.toNumber() * newActualRate

    await prisma.job.update({
      where: { id },
      data: {
        ...(actualRate !== undefined && { actualRate, amount }),
        ...(batha !== undefined && { batha }),
        ...(date && { date: new Date(date) }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/jobs/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const { id } = await params

    const existing = await prisma.job.findFirst({
      where: { id, businessId: user.businessId, deletedAt: null },
    })
    if (!existing) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    await prisma.job.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/jobs/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
