import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  newPassword: z.string().min(1, 'Password is required'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const forbidden = requireAdmin(currentUser)
    if (forbidden) return forbidden

    const { id } = await params

    const body: unknown = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    // Ensure the target belongs to the same business (master_admin can reset anyone)
    const target = await prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(currentUser.roleId !== 'master_admin'
          ? { businessId: currentUser.businessId! }
          : {}),
      },
      select: { id: true, roleId: true },
    })

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)

    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        // When an admin's password is reset by another admin, force them to
        // set their own password on next login for security
        ...(target.roleId === 'admin' ? { mustChangePassword: true } : {}),
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/staff/[id]/reset-password]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
