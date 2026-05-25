import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const updateSiteSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().optional().nullable(),
  batha: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
})

type RouteParams = { params: Promise<{ id: string; siteId: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const { siteId } = await params

    const site = await prisma.site.findUnique({
      where: { id: siteId, deletedAt: null },
      select: { businessId: true },
    })
    if (!site || site.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body: unknown = await request.json()
    const parsed = updateSiteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { name, location, batha, isActive } = parsed.data

    await prisma.site.update({
      where: { id: siteId },
      data: {
        ...(name !== undefined && { name }),
        ...(location !== undefined && { location }),
        ...(batha !== undefined && { batha }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/parties/[id]/sites/[siteId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
