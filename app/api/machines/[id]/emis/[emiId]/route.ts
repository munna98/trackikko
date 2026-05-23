import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'

type RouteParams = { params: Promise<{ id: string; emiId: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const { id, emiId } = await params
    const businessId = user.businessId

    // Confirm machine belongs to user's business
    const machine = await prisma.machine.findUnique({ where: { id, deletedAt: null } })
    if (!machine || machine.businessId !== businessId) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    }

    const emi = await prisma.machineEmi.findUnique({ where: { id: emiId, deletedAt: null } })
    if (!emi || emi.machineId !== id) {
      return NextResponse.json({ error: 'EMI not found' }, { status: 404 })
    }

    if (emi.status === 'closed') {
      return NextResponse.json({ error: 'EMI is already closed' }, { status: 400 })
    }

    await prisma.machineEmi.update({
      where: { id: emiId },
      data: {
        status: 'closed',
        isActive: false,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/machines/[id]/emis/[emiId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
