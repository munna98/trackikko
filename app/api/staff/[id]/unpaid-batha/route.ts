import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const { id: staffId } = await params

    const staff = await prisma.user.findUnique({
      where: { id: staffId, deletedAt: null },
      select: { businessId: true },
    })
    if (!staff || staff.businessId !== user.businessId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const jobs = await prisma.job.findMany({
      where: {
        staffId,
        businessId: user.businessId,
        deletedAt: null,
        bathaPaidBy: 'company',
        bathaPaid: false,
      },
      include: {
        site: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    })

    const totalUnpaid = jobs.reduce((sum, j) => sum + j.batha.toNumber(), 0)

    return NextResponse.json({
      jobs: jobs.map((j) => ({
        id: j.id,
        date: j.date.toISOString().split('T')[0],
        siteName: j.site.name,
        batha: j.batha.toNumber(),
      })),
      totalUnpaid,
      count: jobs.length,
    })
  } catch (err) {
    console.error('[GET /api/staff/[id]/unpaid-batha]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
