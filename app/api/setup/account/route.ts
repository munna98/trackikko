import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Always read businessId from server — never trust client
    const user = await prisma.user.findUnique({
      where: { email: session.user.email, deletedAt: null },
      select: { id: true, businessId: true },
    })

    if (!user?.businessId) {
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
