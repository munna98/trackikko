import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { StaffSheet } from '@/components/staff/staff-sheet'
import { DeactivateButton } from '@/components/staff/deactivate-button'
import { StaffTabs } from '@/components/staff/staff-tabs'
import { StatusBadge } from '@/components/ui/status-badge'
import { getInitials } from '@/lib/utils'
import { Phone, Mail, ChevronLeft } from 'lucide-react'
import type { Metadata } from 'next'

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const member = await prisma.user.findUnique({ where: { id }, select: { name: true } })
  return { title: member?.name ?? 'Staff Member' }
}

export default async function StaffDetailPage({ params }: PageProps) {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const { id } = await params
  const businessId = user.businessId!
  const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [staffMember, advances, payments, accounts, jobsThisMonth] = await Promise.all([
    prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: { role: true },
    }),
    prisma.salaryAdvance.findMany({
      where: { staffId: id, businessId, deletedAt: null },
      include: { account: { select: { name: true } } },
      orderBy: { date: 'desc' },
    }),
    prisma.staffPayment.findMany({
      where: { staffId: id, businessId, deletedAt: null },
      include: { account: { select: { name: true } } },
      orderBy: { periodTo: 'desc' },
    }),
    prisma.account.findMany({
      where: { businessId, deletedAt: null, isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    }),
    prisma.job.findMany({
      where: {
        staffId: id,
        businessId,
        deletedAt: null,
        date: { gte: monthStart },
      },
      select: { batha: true },
    }),
  ])

  if (!staffMember || staffMember.businessId !== businessId) notFound()

  type JobRow = (typeof jobsThisMonth)[number]
  const bathaThisMonth = jobsThisMonth.reduce(
    (s: number, j: JobRow) => s + j.batha.toNumber(),
    0,
  )
  const isSelf = id === user.id

  const ROLE_LABEL: Record<string, string> = {
    master_admin: 'Master Admin',
    admin: 'Admin',
    accountant: 'Accountant',
    operator: 'Operator',
  }

  // ── Serialise all Decimal / Date fields ────────────────────
  type AdvanceRow = (typeof advances)[number]
  type PaymentRow = (typeof payments)[number]
  type AccountRow = (typeof accounts)[number]

  const serialisedAdvances = advances.map((a: AdvanceRow) => ({
    id: a.id,
    date: a.date.toISOString().split('T')[0],
    amount: a.amount.toNumber(),
    accountName: a.account.name,
    notes: a.notes,
  }))

  const serialisedPayments = payments.map((p: PaymentRow) => ({
    id: p.id,
    periodFrom: p.periodFrom.toISOString().split('T')[0],
    periodTo: p.periodTo.toISOString().split('T')[0],
    daysWorked: p.daysWorked,
    bathaTotal: p.bathaTotal?.toNumber() ?? 0,
    salary: p.salary.toNumber(),
    advancesDeducted: p.advancesDeducted?.toNumber() ?? 0,
    netPaid: p.netPaid.toNumber(),
    accountName: p.account.name,
    notes: p.notes,
  }))

  const serialisedAccounts = accounts.map((a: AccountRow) => ({
    id: a.id,
    name: a.name,
    type: a.type as string,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 bg-primary/20 text-primary">
            {getInitials(staffMember.name)}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/staff"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Back to staff"
              >
                <ChevronLeft className="h-6 w-6" />
              </Link>
              <h1 className="text-2xl font-bold text-foreground">{staffMember.name}</h1>
            </div>
            {staffMember.designation && (
              <p className="text-sm text-muted-foreground">{staffMember.designation}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">
                {ROLE_LABEL[staffMember.roleId] ?? staffMember.role.name}
              </Badge>
              {staffMember.bloodGroup && staffMember.bloodGroup !== 'Unknown' && (
                <Badge variant="outline">{staffMember.bloodGroup}</Badge>
              )}
              {!staffMember.isActive && <StatusBadge status="inactive" />}
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
              {staffMember.mobile && (
                <a
                  href={`tel:${staffMember.mobile}`}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {staffMember.mobile}
                </a>
              )}
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {staffMember.email}
              </span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex gap-2 flex-shrink-0">
            <StaffSheet
              defaultValues={{
                id: staffMember.id,
                name: staffMember.name,
                email: staffMember.email,
                roleId: staffMember.roleId as 'admin' | 'accountant' | 'operator',
                mobile: staffMember.mobile ?? undefined,
                address: staffMember.address ?? undefined,
                bloodGroup: staffMember.bloodGroup ?? undefined,
                designation: staffMember.designation ?? undefined,
              }}
              currentUserId={user.id}
            />
            {!isSelf && (
              <DeactivateButton
                staffId={staffMember.id}
                isActive={staffMember.isActive}
              />
            )}
          </div>
        )}
      </div>

      {/* Tabs (client component) */}
      <StaffTabs
        staffId={id}
        isAdmin={isAdmin}
        advanceBalance={staffMember.advanceBalance.toNumber()}
        daysWorkedThisMonth={jobsThisMonth.length}
        bathaThisMonth={bathaThisMonth}
        advances={serialisedAdvances}
        payments={serialisedPayments}
        accounts={serialisedAccounts}
      />
    </div>
  )
}
