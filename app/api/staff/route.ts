import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const createStaffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  roleId: z.enum(['admin', 'accountant', 'operator']),
  password: z.string().min(1, 'Password or PIN is required'),
  mobile: z.string().optional(),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  designation: z.string().optional(),
})

/** Auto-generate a unique username from the first word of a name */
async function generateUsername(name: string): Promise<string> {
  const base =
    name.toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '') || 'user'
  let candidate = base
  let counter = 2
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
    })
    if (!existing) return candidate
    candidate = `${base}${counter}`
    counter++
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId)
      return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const body: unknown = await request.json()
    const parsed = createStaffSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { name, email, roleId, password, mobile, address, bloodGroup, designation } =
      parsed.data
    const businessId = user.businessId

    // Check email uniqueness if provided
    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, deletedAt: null },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        )
      }
    }

    // Operators get an auto-generated username; others can optionally have one
    const username = roleId === 'operator' ? await generateUsername(name) : null

    const passwordHash = await bcrypt.hash(password, 12)

    const staffMember = await prisma.user.create({
      data: {
        name,
        email: email || null,
        username,
        passwordHash,
        mustChangePassword: roleId === 'admin', // admins must set own password on first login
        roleId,
        businessId,
        mobile: mobile || null,
        address: address || null,
        bloodGroup: bloodGroup || null,
        designation: designation || null,
      },
    })

    return NextResponse.json({ id: staffMember.id, username }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/staff]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
