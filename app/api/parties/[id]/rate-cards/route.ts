import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const createRateCardSchema = z.object({
  machineId: z.string().min(1, 'Machine is required'),
  siteId: z.string().nullable().optional(),
  mode: z.enum(['bucket', 'breaking']).nullable().optional(),
  rateType: z.enum(['per_hour', 'per_trip']),
  rate: z.coerce.number().positive('Rate must be positive'),
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
    const parsed = createRateCardSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Invalid input'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { machineId, siteId, mode, rateType, rate } = parsed.data

    try {
      const rateCard = await prisma.rateCard.create({
        data: {
          businessId: user.businessId,
          machineId,
          partyId,
          siteId: siteId ?? null,
          mode: mode ?? null,
          rateType,
          rate,
        },
      })
      return NextResponse.json({ id: rateCard.id }, { status: 201 })
    } catch (dbErr: unknown) {
      if (
        typeof dbErr === 'object' &&
        dbErr !== null &&
        'code' in dbErr &&
        (dbErr as { code: string }).code === 'P2002'
      ) {
        return NextResponse.json(
          { error: 'A rate card already exists for this combination. Use Edit Rate to update it.' },
          { status: 409 }
        )
      }
      throw dbErr
    }
  } catch (err) {
    console.error('[POST /api/parties/[id]/rate-cards]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
