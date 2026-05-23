import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json() as { email: string }

    if (!email) {
      return NextResponse.json(null, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        roleId: true,
        businessId: true,
      },
    })

    if (!user) {
      return NextResponse.json(null, { status: 404 })
    }

    return NextResponse.json(user)
  } catch {
    return NextResponse.json(null, { status: 500 })
  }
}
