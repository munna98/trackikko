import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const createStaffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  roleId: z.enum(['admin', 'accountant', 'operator']),
  mobile: z.string().optional(),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  designation: z.string().optional(),
  defaultBatha: z.coerce.number().min(0).default(0),
  salary: z.coerce.number().min(0).default(0),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const forbidden = requireAdmin(user)
    if (forbidden) return forbidden

    const body: unknown = await request.json()
    const parsed = createStaffSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const { name, email, roleId, mobile, address, bloodGroup, designation, defaultBatha, salary } = parsed.data
    const businessId = user.businessId

    // Check email not already used in this business
    const existing = await prisma.user.findFirst({
      where: { email, businessId, deletedAt: null },
    })
    if (existing) {
      return NextResponse.json({ error: 'A staff member with this email already exists' }, { status: 409 })
    }

    // Send Supabase auth invite
    const adminClient = createAdminClient()
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { name },
    })

    if (inviteError) {
      console.error('[POST /api/staff] Supabase invite error:', inviteError)
      return NextResponse.json({ error: `Failed to send invite: ${inviteError.message}` }, { status: 500 })
    }

    // Create DB row
    const staffMember = await prisma.user.create({
      data: {
        email,
        name,
        roleId,
        businessId,
        mobile: mobile || null,
        address: address || null,
        bloodGroup: bloodGroup || null,
        designation: designation || null,
        defaultBatha,
        salary,
      },
    })

    return NextResponse.json({ id: staffMember.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/staff]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
