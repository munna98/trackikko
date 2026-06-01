import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const patchJobSchema = z.object({
  actualRate: z.coerce.number().min(0).optional(),
  batha: z.coerce.number().min(0).optional(),
  bathaPaidBy: z.enum(['party', 'company']).optional(),
  date: z.string().optional(),
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

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const { id } = await params

    const body: unknown = await request.json()
    const parsed = patchJobSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { actualRate, batha, bathaPaidBy, date, isReviewed } = parsed.data

    const existing = await prisma.job.findFirst({
      where: { id, businessId: user.businessId, deletedAt: null },
      include: {
        machine: true,
        site: {
          include: { party: true }
        }
      }
    })
    if (!existing) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    // Recompute amount if actualRate changes
    const oldAmount = existing.amount.toNumber()
    const newActualRate = actualRate ?? existing.actualRate.toNumber()
    const newAmount = existing.quantity.toNumber() * newActualRate
    const diff = newAmount - oldAmount
    const newDate = date ? new Date(date) : existing.date

    await prisma.$transaction(async (tx) => {
      // 1. Update Job
      await tx.job.update({
        where: { id },
        data: {
          ...(actualRate !== undefined && { actualRate, amount: newAmount }),
          ...(batha !== undefined && { batha }),
          ...(bathaPaidBy !== undefined && { bathaPaidBy }),
          ...(date && { date: newDate }),
          ...(isReviewed !== undefined && { isReviewed }),
        },
      })

      // 2. Find associated LedgerEntry
      const ledgerEntry = await tx.ledgerEntry.findFirst({
        where: { referenceId: id, type: 'job' }
      })

      if (ledgerEntry) {
        // Update party running balance by diff
        if (diff !== 0) {
          await tx.party.update({
            where: { id: existing.site.party.id },
            data: { runningBalance: { increment: diff } }
          })
        }

        // Update LedgerEntry
        await tx.ledgerEntry.update({
          where: { id: ledgerEntry.id },
          data: {
            date: newDate,
            amount: newAmount,
            recordedBy: user.id,
          }
        })
      } else {
        // Self-healing: create the missing ledger entry for legacy job
        // Increment party running balance by the full newAmount (since it was never added before)
        await tx.party.update({
          where: { id: existing.site.party.id },
          data: { runningBalance: { increment: newAmount } }
        })

        await tx.ledgerEntry.create({
          data: {
            businessId: user.businessId!,
            date: newDate,
            type: 'job',
            referenceId: id,
            partyId: existing.site.party.id,
            machineId: existing.machineId,
            staffId: existing.staffId,
            entryType: 'debit',
            amount: newAmount,
            recordedBy: user.id,
            description: `${existing.machine.name} – ${existing.site.name}`,
          }
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/jobs/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const { id } = await params

    const existing = await prisma.job.findFirst({
      where: { id, businessId: user.businessId, deletedAt: null },
      include: {
        site: {
          include: { party: true }
        }
      }
    })
    if (!existing) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      // 1. Soft-delete Job
      await tx.job.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: user.id,
        },
      })

      // 2. Find associated LedgerEntry
      const ledgerEntry = await tx.ledgerEntry.findFirst({
        where: { referenceId: id, type: 'job' }
      })

      if (ledgerEntry) {
        // 3. Decrement party running balance (only if it was ledgered)
        await tx.party.update({
          where: { id: existing.site.party.id },
          data: { runningBalance: { decrement: ledgerEntry.amount } }
        })

        // 4. Delete LedgerEntry
        await tx.ledgerEntry.delete({
          where: { id: ledgerEntry.id }
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/jobs/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
