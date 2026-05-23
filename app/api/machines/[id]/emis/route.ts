import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const createEmiSchema = z.object({
  financierName: z.string().min(1, 'Financier name is required'),
  monthlyAmount: z.coerce.number().positive('Amount must be positive'),
  totalInstallments: z.coerce.number().int().min(1, 'Must have at least 1 installment'),
  startDate: z.string().min(1, 'Start date is required'),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const { id } = await params
    const businessId = user.businessId

    const machine = await prisma.machine.findUnique({ where: { id, deletedAt: null } })
    if (!machine || machine.businessId !== businessId) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    }

    const body: unknown = await request.json()
    const parsed = createEmiSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { financierName, monthlyAmount, totalInstallments, startDate } = parsed.data

    const emi = await prisma.machineEmi.create({
      data: {
        businessId,
        machineId: id,
        financierName,
        monthlyAmount,
        totalInstallments,
        startDate: new Date(startDate),
        status: 'active',
        isActive: true,
      },
    })

    return NextResponse.json({ id: emi.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/machines/[id]/emis]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
