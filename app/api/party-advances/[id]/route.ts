import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const advanceSchema = z.object({
  partyId: z.string().min(1, "Party is required"),
  date: z.string().min(1, "Date is required"),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  accountId: z.string().min(1, "Account is required"),
  notes: z.string().optional().nullable(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can edit advances' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = advanceSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const { partyId, date, amount, accountId, notes } = parsed.data

    const oldAdvance = await prisma.partyAdvance.findUnique({
      where: { id, businessId: user.businessId },
    })

    if (!oldAdvance) {
      return NextResponse.json({ error: 'Advance not found' }, { status: 404 })
    }

    // Validation checks for ownership of new party & account
    const newParty = await prisma.party.findUnique({
      where: { id: partyId, businessId: user.businessId, deletedAt: null },
      select: { id: true },
    })
    if (!newParty) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }

    const newAccount = await prisma.account.findUnique({
      where: { id: accountId, businessId: user.businessId, deletedAt: null },
      select: { id: true },
    })
    if (!newAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const advanceDate = new Date(date)
      const oldAmount = oldAdvance.amount.toNumber()

      // 1. Revert old party runningBalance (increment it back since advance decremented it originally)
      await tx.party.update({
        where: { id: oldAdvance.partyId },
        data: { runningBalance: { increment: oldAmount } },
      })

      // 2. Revert old account balance (decrement it back since advance incremented it originally)
      await tx.account.update({
        where: { id: oldAdvance.accountId },
        data: { currentBalance: { decrement: oldAmount } },
      })

      // 3. Apply new party runningBalance (decrement by new amount)
      await tx.party.update({
        where: { id: partyId },
        data: { runningBalance: { decrement: amount } },
      })

      // 4. Apply new account balance (increment by new amount)
      await tx.account.update({
        where: { id: accountId },
        data: { currentBalance: { increment: amount } },
      })

      // 5. Update PartyAdvance row
      const updatedAdvance = await tx.partyAdvance.update({
        where: { id },
        data: {
          partyId,
          date: advanceDate,
          amount,
          accountId,
          notes,
        },
      })

      // 6. Update LedgerEntry
      const ledgerEntry = await tx.ledgerEntry.findFirst({
        where: { referenceId: id, type: 'party_advance' }
      })

      if (ledgerEntry) {
        await tx.ledgerEntry.update({
          where: { id: ledgerEntry.id },
          data: {
            date: advanceDate,
            accountId,
            partyId,
            amount,
            description: notes ?? `Party advance received`,
          },
        })
      }

      return updatedAdvance
    })

    return NextResponse.json({ id: result.id })
  } catch (err) {
    console.error('[PUT /api/party-advances/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const patchAdvanceSchema = z.object({
  isReviewed: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can review advances' }, { status: 403 })
    }

    const { id } = await params

    const body = await request.json()
    const parsed = patchAdvanceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const { isReviewed } = parsed.data

    const existing = await prisma.partyAdvance.findFirst({
      where: { id, businessId: user.businessId, deletedAt: null }
    })
    if (!existing) return NextResponse.json({ error: 'Advance not found' }, { status: 404 })

    await prisma.partyAdvance.update({
      where: { id },
      data: {
        ...(isReviewed !== undefined && { isReviewed })
      }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/party-advances/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

