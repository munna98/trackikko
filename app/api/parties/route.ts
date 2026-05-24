import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const createPartySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().nullish(),
  address: z.string().nullish(),
  gstNo: z.string().nullish(),
  openingBalance: z.coerce.number().default(0), // signed: positive = Dr, negative = Cr
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const body: unknown = await request.json()
    const parsed = createPartySchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Invalid input'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { name, mobile, address, gstNo, openingBalance } = parsed.data
    const businessId = user.businessId

    const party = await prisma.party.create({
      data: {
        businessId,
        name,
        mobile: mobile || null,
        address: address || null,
        gstNo: gstNo || null,
        openingBalance,
        runningBalance: openingBalance,
      },
    })

    return NextResponse.json({ id: party.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/parties]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
