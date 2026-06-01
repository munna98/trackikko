import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions, type SessionData } from '@/lib/session'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  login: z.string().min(1, 'Required'),
  password: z.string().min(1, 'Required'),
})

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { login, password } = parsed.data
    const isEmail = login.includes('@')

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        ...(isEmail ? { email: login } : { username: login }),
      },
      select: {
        id: true,
        roleId: true,
        businessId: true,
        passwordHash: true,
        mustChangePassword: true,
        isActive: true,
      },
    })

    if (!user?.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Write session
    const cookieStore = await cookies()
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
    session.userId = user.id
    session.roleId = user.roleId
    session.businessId = user.businessId ?? null
    session.mustChangePassword = user.mustChangePassword
    await session.save()

    return NextResponse.json({
      roleId: user.roleId,
      businessId: user.businessId ?? null,
      mustChangePassword: user.mustChangePassword,
    })
  } catch (err) {
    console.error('[POST /api/auth/login]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
