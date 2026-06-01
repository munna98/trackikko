import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // If already has a business, return existing
    if (user.businessId) {
      return NextResponse.json({ businessId: user.businessId })
    }

    const body = await request.json() as { name: string; phone?: string; address?: string }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
    }

    // Create business and link to user in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const business = await tx.business.create({
        data: {
          name: body.name.trim(),
          phone: body.phone?.trim() || null,
          address: body.address?.trim() || null,
        },
      })

      await tx.user.update({
        where: { id: user.id },
        data: { businessId: business.id },
      })

      return business
    })

    return NextResponse.json({ businessId: result.id })
  } catch (err) {
    console.error('[setup/business]', err)
    return NextResponse.json({ error: 'Failed to create business' }, { status: 500 })
  }
}
