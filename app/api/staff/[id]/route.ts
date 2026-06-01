import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { z } from 'zod'

const editStaffSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  roleId: z.enum(['admin', 'accountant', 'operator']).optional(),
  username: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  baseSalary: z.coerce.number().positive().optional().nullable(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const { id } = await params
    const businessId = user.businessId

    const staffMember = await prisma.user.findUnique({ where: { id, deletedAt: null } })
    if (!staffMember || staffMember.businessId !== businessId) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    const body: unknown = await request.json()
    const parsed = editStaffSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const { name, roleId, username, mobile, address, bloodGroup, designation, baseSalary } = parsed.data

    // Cannot change own role
    if (roleId && id === user.id) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    // Check username uniqueness if changing/setting
    if (username) {
      const cleanUsername = username.trim().toLowerCase()
      if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
        return NextResponse.json({ error: 'Username must contain only letters, numbers, or underscores' }, { status: 400 })
      }

      const existing = await prisma.user.findFirst({
        where: {
          username: cleanUsername,
          id: { not: id },
          deletedAt: null,
        },
      })
      if (existing) {
        return NextResponse.json({ error: 'This username is already taken' }, { status: 409 })
      }
    }

    await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(roleId !== undefined && { roleId }),
        ...(username !== undefined && { username: username ? username.trim().toLowerCase() : null }),
        ...(mobile !== undefined && { mobile }),
        ...(address !== undefined && { address }),
        ...(bloodGroup !== undefined && { bloodGroup }),
        ...(designation !== undefined && { designation }),
        ...(baseSalary !== undefined && { baseSalary: baseSalary ?? null }),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/staff/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
