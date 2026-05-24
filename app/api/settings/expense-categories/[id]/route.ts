import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  appliesTo: z.enum(['machine', 'staff', 'other']).nullable().optional(),
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

    const category = await prisma.expenseCategory.findUnique({
      where: { id, deletedAt: null },
      select: { businessId: true },
    })
    if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Cannot edit global categories
    if (category.businessId === null) {
      return NextResponse.json({ error: 'Cannot edit global categories' }, { status: 403 })
    }
    if (category.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body: unknown = await request.json()
    const parsed = updateCategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const { name, appliesTo, isActive } = parsed.data

    await prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(appliesTo !== undefined && { appliesTo }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/settings/expense-categories/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
