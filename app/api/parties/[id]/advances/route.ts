import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const advanceSchema = z.object({
  date: z.string().min(1, "Date is required"),
  amount: z.number().positive("Amount must be positive"),
  accountId: z.string().min(1, "Account ID is required"),
  notes: z.string().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const { id: partyId } = await params

    const party = await prisma.party.findUnique({
      where: { id: partyId, deletedAt: null },
      select: { businessId: true },
    })

    if (!party || party.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = advanceSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const { date, amount, accountId, notes } = parsed.data

    const account = await prisma.account.findUnique({
      where: { id: accountId, deletedAt: null },
      select: { businessId: true },
    })

    if (!account || account.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const advanceDate = new Date(date)

      // 1. Create PartyAdvance row
      const advance = await tx.partyAdvance.create({
        data: {
          businessId: user.businessId!,
          partyId,
          date: advanceDate,
          amount,
          accountId,
          notes,
          recordedBy: user.id,
        },
      })

      // 2. Decrement party.runningBalance by amount (party pre-pays us -> they owe us less)
      await tx.party.update({
        where: { id: partyId },
        data: { runningBalance: { decrement: amount } },
      })

      // 3. Increment account.currentBalance by amount (we received cash)
      await tx.account.update({
        where: { id: accountId },
        data: { currentBalance: { increment: amount } },
      })

      // 4. Create LedgerEntry
      await tx.ledgerEntry.create({
        data: {
          businessId: user.businessId!,
          date: advanceDate,
          type: 'party_advance',
          referenceId: advance.id,
          accountId,
          partyId,
          entryType: 'credit',
          amount,
          recordedBy: user.id,
          description: notes ?? `Party advance received`,
        },
      })

      return advance
    })

    return NextResponse.json({ id: result.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/parties/[id]/advances]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const { id: partyId } = await params

    const party = await prisma.party.findUnique({
      where: { id: partyId, deletedAt: null },
      select: { businessId: true },
    })

    if (!party || party.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }

    const advances = await prisma.partyAdvance.findMany({
      where: { partyId, businessId: user.businessId, deletedAt: null },
      include: {
        account: { select: { name: true } }
      },
      orderBy: { date: 'desc' },
    })

    const serialized = advances.map(a => ({
      id: a.id,
      date: a.date.toISOString().split('T')[0],
      amount: a.amount.toNumber(),
      accountName: a.account.name,
      notes: a.notes,
    }))

    return NextResponse.json(serialized)
  } catch (err) {
    console.error('[GET /api/parties/[id]/advances]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
