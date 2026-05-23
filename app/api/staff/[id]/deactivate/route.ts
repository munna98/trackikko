import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'

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

    // Cannot deactivate self
    if (id === user.id) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 })
    }

    const staffMember = await prisma.user.findUnique({ where: { id, deletedAt: null } })
    if (!staffMember || staffMember.businessId !== businessId) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Toggle isActive — deactivation is NOT a soft delete (they still exist in records)
    const newIsActive = !staffMember.isActive

    await prisma.user.update({
      where: { id },
      data: {
        isActive: newIsActive,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ isActive: newIsActive })
  } catch (err) {
    console.error('[PATCH /api/staff/[id]/deactivate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
