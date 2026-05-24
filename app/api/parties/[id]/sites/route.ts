import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const createSiteSchema = z.object({
  name: z.string().min(1, 'Site name is required'),
  location: z.string().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const { id: partyId } = await params

    const party = await prisma.party.findUnique({
      where: { id: partyId, deletedAt: null },
      select: { businessId: true },
    })
    if (!party || party.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body: unknown = await request.json()
    const parsed = createSiteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const site = await prisma.site.create({
      data: {
        businessId: user.businessId,
        partyId,
        name: parsed.data.name,
        location: parsed.data.location || null,
      },
    })

    return NextResponse.json({ id: site.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/parties/[id]/sites]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
