import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'

type RouteParams = { params: Promise<{ id: string; rateCardId: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const { rateCardId } = await params

    const rateCard = await prisma.rateCard.findUnique({
      where: { id: rateCardId, deletedAt: null },
      select: { businessId: true },
    })
    if (!rateCard || rateCard.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.rateCard.update({
      where: { id: rateCardId },
      data: { isActive: false, updatedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/parties/[id]/rate-cards/[rateCardId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
