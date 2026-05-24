import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const updatePartySchema = z.object({
  name: z.string().min(1).optional(),
  mobile: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  gstNo: z.string().optional().nullable(),
  openingBalance: z.coerce.number().optional(),
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

    const party = await prisma.party.findUnique({
      where: { id, deletedAt: null },
      select: { businessId: true, openingBalance: true, runningBalance: true },
    })

    if (!party || party.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body: unknown = await request.json()
    const parsed = updatePartySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { name, mobile, address, gstNo, openingBalance } = parsed.data

    // Adjust runningBalance by the diff in opening balance
    let runningBalanceUpdate: number | undefined
    if (openingBalance !== undefined) {
      const diff = openingBalance - party.openingBalance.toNumber()
      runningBalanceUpdate = party.runningBalance.toNumber() + diff
    }

    await prisma.party.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(mobile !== undefined && { mobile }),
        ...(address !== undefined && { address }),
        ...(gstNo !== undefined && { gstNo }),
        ...(openingBalance !== undefined && { openingBalance }),
        ...(runningBalanceUpdate !== undefined && { runningBalance: runningBalanceUpdate }),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/parties/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
