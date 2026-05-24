import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const createAccountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['cash', 'bank']),
  openingBalance: z.coerce.number().default(0),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const body: unknown = await request.json()
    const parsed = createAccountSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { name, type, openingBalance } = parsed.data
    const businessId = user.businessId

    try {
      const account = await prisma.account.create({
        data: { businessId, name, type, openingBalance, currentBalance: openingBalance },
      })
      return NextResponse.json({ id: account.id }, { status: 201 })
    } catch (dbErr: unknown) {
      if (
        typeof dbErr === 'object' && dbErr !== null && 'code' in dbErr &&
        (dbErr as { code: string }).code === 'P2002'
      ) {
        return NextResponse.json({ error: 'An account with this name already exists' }, { status: 409 })
      }
      throw dbErr
    }
  } catch (err) {
    console.error('[POST /api/settings/accounts]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
