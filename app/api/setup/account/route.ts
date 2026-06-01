import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!user.businessId) {
      return NextResponse.json({ error: 'No business found' }, { status: 400 })
    }

    const body = await request.json() as {
      name: string
      type: 'cash' | 'bank'
      openingBalance: number
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Account label is required' }, { status: 400 })
    }

    const account = await prisma.account.create({
      data: {
        businessId: user.businessId,
        name: body.name.trim(),
        type: body.type,
        openingBalance: body.openingBalance ?? 0,
        currentBalance: body.openingBalance ?? 0,
      },
    })

    return NextResponse.json({ accountId: account.id })
  } catch (err) {
    console.error('[setup/account]', err)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
