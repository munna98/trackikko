import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  appliesTo: z.enum(['machine', 'staff', 'other']).nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const body: unknown = await request.json()
    const parsed = createCategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const category = await prisma.expenseCategory.create({
      data: {
        businessId: user.businessId,
        name: parsed.data.name,
        appliesTo: parsed.data.appliesTo ?? null,
      },
    })

    return NextResponse.json({ id: category.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/settings/expense-categories]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
