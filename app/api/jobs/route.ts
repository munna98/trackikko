import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { MachineMode, RateTypeEnum } from '@prisma/client'

const ADMIN_ROLES = ['master_admin', 'admin']

const createJobSchema = z.object({
  machineId: z.string().min(1, 'Machine is required'),
  siteId: z.string().min(1, 'Site is required'),
  date: z.string().min(1, 'Date is required'),
  mode: z.enum(['bucket', 'breaking']).optional().nullable(),
  startReading: z.coerce.number().optional().nullable(),
  closingReading: z.coerce.number().optional().nullable(),
  tripCount: z.coerce.number().int().min(0).optional().nullable(),
  actualRate: z.coerce.number().min(0, 'Rate is required'),
  batha: z.coerce.number().min(0).default(0),
  staffId: z.string().optional(), // only admins can set this
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const isAdmin = ADMIN_ROLES.includes(user.roleId)

    const body: unknown = await request.json()
    const parsed = createJobSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const {
      machineId,
      siteId,
      date,
      mode,
      startReading,
      closingReading,
      tripCount,
      actualRate,
      batha,
      staffId: bodyStaffId,
    } = parsed.data

    const businessId = user.businessId

    // Resolve staffId: operator logs own job; admin can pick
    const staffId = isAdmin && bodyStaffId ? bodyStaffId : user.id

    // Fetch machine + site in parallel
    const [machine, site] = await Promise.all([
      prisma.machine.findFirst({
        where: { id: machineId, businessId, deletedAt: null },
        include: { machineType: true },
      }),
      prisma.site.findFirst({
        where: { id: siteId, businessId, deletedAt: null },
        include: { party: true },
      }),
    ])

    if (!machine) return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

    const trackingUnit = machine.machineType.trackingUnit

    // Compute quantity
    let quantity: number
    let rateType: RateTypeEnum

    if (trackingUnit === 'trips') {
      if (tripCount == null || tripCount < 0)
        return NextResponse.json({ error: 'Trip count is required' }, { status: 400 })
      quantity = tripCount
      rateType = 'per_trip'
    } else {
      // hours or km — meter reading based
      if (startReading == null || closingReading == null)
        return NextResponse.json(
          { error: 'Start and closing readings are required' },
          { status: 400 }
        )
      if (closingReading <= startReading)
        return NextResponse.json(
          { error: 'Closing reading must be greater than start reading' },
          { status: 400 }
        )
      quantity = closingReading - startReading
      rateType = 'per_hour'
    }

    // Rate card lookup: most specific first
    const partyId = site.party.id
    const modeVal: MachineMode | null = mode ?? null

    const rateCard = await prisma.rateCard.findFirst({
      where: {
        machineId,
        partyId,
        isActive: true,
        deletedAt: null,
        OR: [
          { siteId, mode: modeVal },
          { siteId: null, mode: modeVal },
          { siteId, mode: null },
          { siteId: null, mode: null },
        ],
      },
      orderBy: [{ siteId: 'desc' }, { mode: 'desc' }],
    })

    const rateCardRate = rateCard?.rate ? Number(rateCard.rate) : null
    const amount = quantity * actualRate

    const job = await prisma.job.create({
      data: {
        businessId,
        machineId,
        staffId,
        siteId,
        date: new Date(date),
        startReading: startReading != null ? startReading : null,
        closingReading: closingReading != null ? closingReading : null,
        tripCount: tripCount != null ? tripCount : null,
        quantity,
        mode: mode ?? null,
        rateType,
        rateCardRate: rateCardRate != null ? rateCardRate : null,
        actualRate,
        amount,
        batha,
        recordedBy: user.id,
      },
    })

    return NextResponse.json({ id: job.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/jobs]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.businessId) return NextResponse.json({ error: 'No business' }, { status: 403 })

    const isAdmin = ADMIN_ROLES.includes(user.roleId)
    const businessId = user.businessId

    const { searchParams } = new URL(request.url)
    const machineId = searchParams.get('machineId') ?? undefined
    const siteId = searchParams.get('siteId') ?? undefined
    const from = searchParams.get('from') ?? undefined
    const to = searchParams.get('to') ?? undefined
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 50)))

    // Operators can only see their own jobs
    const staffIdParam = searchParams.get('staffId') ?? undefined
    const staffId = isAdmin ? staffIdParam : user.id

    const jobs = await prisma.job.findMany({
      where: {
        businessId,
        deletedAt: null,
        ...(machineId && { machineId }),
        ...(staffId && { staffId }),
        ...(siteId && { siteId }),
        ...(from && { date: { gte: new Date(from) } }),
        ...(to && { date: { lte: new Date(to) } }),
      },
      include: {
        machine: { include: { machineType: true } },
        site: { include: { party: true } },
        staff: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    type JobRow = (typeof jobs)[number]
    const serialised = jobs.map((j: JobRow) => ({
      id: j.id,
      date: j.date.toISOString(),
      machineName: j.machine.name,
      machineId: j.machine.id,
      trackingUnit: j.machine.machineType.trackingUnit,
      partyName: j.site.party.name,
      siteName: j.site.name,
      siteId: j.site.id,
      mode: j.mode,
      quantity: j.quantity.toNumber(),
      rateType: j.rateType,
      actualRate: j.actualRate.toNumber(),
      amount: j.amount.toNumber(),
      batha: j.batha.toNumber(),
      staffName: j.staff.name,
      staffId: j.staff.id,
    }))

    return NextResponse.json({ jobs: serialised, page, limit })
  } catch (err) {
    console.error('[GET /api/jobs]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
