import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions, type SessionData } from '@/lib/session'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: unknown = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)

    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash, mustChangePassword: false },
    })

    // Clear the flag in the live session too
    session.mustChangePassword = false
    await session.save()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/auth/change-password]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
