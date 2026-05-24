import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { StaffSheet } from '@/components/staff/staff-sheet'
import { DeactivateButton } from '@/components/staff/deactivate-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatINR, getInitials } from '@/lib/utils'
import { Phone, Mail, Banknote, Receipt, ChevronLeft } from 'lucide-react'
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

  const staffMember = await prisma.user.findUnique({
    where: { id, deletedAt: null },
    include: { role: true },
  })

  if (!staffMember || staffMember.businessId !== businessId) notFound()

  // Jobs this month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const jobsThisMonth = await prisma.job.findMany({
    where: {
      staffId: id,
      businessId,
      deletedAt: null,
      date: { gte: monthStart },
    },
    select: { batha: true },
  })

  type JobRow = (typeof jobsThisMonth)[number]
  const bathaThisMonth = jobsThisMonth.reduce((s: number, j: JobRow) => s + j.batha.toNumber(), 0)
  const isSelf = id === user.id

  const ROLE_LABEL: Record<string, string> = {
    master_admin: 'Master Admin',
    admin: 'Admin',
    accountant: 'Accountant',
    operator: 'Operator',
  }

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
              <Badge variant="secondary">{ROLE_LABEL[staffMember.roleId] ?? staffMember.role.name}</Badge>
              {staffMember.bloodGroup && staffMember.bloodGroup !== 'Unknown' && (
                <Badge variant="outline">{staffMember.bloodGroup}</Badge>
              )}
              {!staffMember.isActive && <StatusBadge status="inactive" />}
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
              {staffMember.mobile && (
                <a href={`tel:${staffMember.mobile}`} className="flex items-center gap-1 hover:text-primary transition-colors">
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
                defaultBatha: staffMember.defaultBatha.toNumber(),
                salary: staffMember.salary.toNumber(),
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

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-col">
        <TabsList className="w-full h-auto flex-wrap justify-start gap-0.5 p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="advances">Advances</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Monthly Salary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-foreground">{formatINR(staffMember.salary.toNumber())}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Default Batha</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-foreground">{formatINR(staffMember.defaultBatha.toNumber())}</p>
                <p className="text-xs text-muted-foreground">/day</p>
              </CardContent>
            </Card>

            <Card className={staffMember.advanceBalance.toNumber() > 0 ? 'border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10' : ''}>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Advance Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-xl font-bold ${staffMember.advanceBalance.toNumber() > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'}`}>
                  {formatINR(staffMember.advanceBalance.toNumber())}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Days Worked (Month)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-foreground">{jobsThisMonth.length}</p>
                <p className="text-xs text-muted-foreground">jobs this month</p>
              </CardContent>
            </Card>
          </div>

          {/* Batha earned this month */}
          {jobsThisMonth.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Batha Earned This Month</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatINR(bathaThisMonth)}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="advances">
          <EmptyState
            icon={Banknote}
            title="Salary Advances"
            description="Advance management coming in Phase 4."
          />
        </TabsContent>

        <TabsContent value="payments">
          <EmptyState
            icon={Receipt}
            title="Payment History"
            description="Payment history coming in Phase 4."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
