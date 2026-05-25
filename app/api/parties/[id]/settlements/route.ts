import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const createSettlementSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amountReceived: z.coerce.number().min(0, 'Amount must be ≥ 0'),
  writeoffAmount: z.coerce.number().min(0).default(0),
  accountId: z.string().min(1, 'Account is required'),
  notes: z.string().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

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
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const settlements = await prisma.partySettlement.findMany({
      where: { partyId, businessId: user.businessId, deletedAt: null },
      include: { account: { select: { name: true } } },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(
      settlements.map((s) => ({
        id: s.id,
        date: s.date.toISOString().split('T')[0],
        balanceBefore: s.balanceBefore.toNumber(),
        amountReceived: s.amountReceived.toNumber(),
        writeoffAmount: s.writeoffAmount?.toNumber() ?? 0,
        accountName: s.account.name,
        notes: s.notes,
      })),
    )
  } catch (err) {
    console.error('[GET /api/parties/[id]/settlements]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const { id: partyId } = await params
    const businessId = user.businessId

    const party = await prisma.party.findUnique({
      where: { id: partyId, deletedAt: null },
      select: { businessId: true, runningBalance: true, name: true },
    })
    if (!party || party.businessId !== businessId) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }

    const body: unknown = await request.json()
    const parsed = createSettlementSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      )
    }

    const { date, amountReceived, writeoffAmount, accountId, notes } = parsed.data

    const account = await prisma.account.findUnique({
      where: { id: accountId, deletedAt: null },
      select: { businessId: true },
    })
    if (!account || account.businessId !== businessId) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const balanceBefore = party.runningBalance.toNumber()
    const newBalance = balanceBefore - amountReceived - writeoffAmount

    const settlement = await prisma.$transaction(async (tx) => {
      const s = await tx.partySettlement.create({
        data: {
          businessId,
          partyId,
          date: new Date(date),
          balanceBefore,
          amountReceived,
          writeoffAmount,
          accountId,
          notes: notes ?? null,
          recordedBy: user.id,
        },
      })

      await tx.party.update({
        where: { id: partyId },
        data: { runningBalance: newBalance },
      })

      // Credit account with received amount
      if (amountReceived > 0) {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { increment: amountReceived } },
        })
      }

      // Ledger entry for received cash
      await tx.ledgerEntry.create({
        data: {
          businessId,
          date: new Date(date),
          type: 'party_settlement',
          referenceId: s.id,
          accountId,
          partyId,
          entryType: 'credit',
          amount: amountReceived,
          description: `Settlement received – ${party.name}`,
          recordedBy: user.id,
        },
      })

      // Separate ledger entry for writeoff
      if (writeoffAmount > 0) {
        await tx.ledgerEntry.create({
          data: {
            businessId,
            date: new Date(date),
            type: 'party_writeoff',
            referenceId: s.id,
            partyId,
            entryType: 'credit',
            amount: writeoffAmount,
            description: `Writeoff – ${party.name}`,
            recordedBy: user.id,
          },
        })
      }

      return s
    })

    return NextResponse.json({ id: settlement.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/parties/[id]/settlements]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
