import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StaffPaymentForm } from '@/components/staff/staff-payment-form'
import { ChevronLeft } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import type { Metadata } from 'next'

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const member = await prisma.user.findUnique({ where: { id }, select: { name: true } })
  return { title: `Record Payment – ${member?.name ?? 'Staff'}` }
}

export default async function RecordPaymentPage({ params }: PageProps) {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  // Admin-only page
  const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'
  if (!isAdmin) redirect('/dashboard')

  const { id } = await params
  const businessId = user.businessId!

  const [staffMember, accounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        designation: true,
        businessId: true,
        advanceBalance: true,
      },
    }),
    prisma.account.findMany({
      where: { businessId, deletedAt: null, isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!staffMember || staffMember.businessId !== businessId) notFound()

  type AccountRow = (typeof accounts)[number]
  const serialisedAccounts = accounts.map((a: AccountRow) => ({
    id: a.id,
    name: a.name,
    type: a.type as string,
  }))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href={`/dashboard/staff/${id}`}
          className="mt-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Back to staff member"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>

        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0 bg-primary/20 text-primary">
            {getInitials(staffMember.name)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">
              Record Payment
            </h1>
            <p className="text-sm text-muted-foreground">
              {staffMember.name}
              {staffMember.designation ? ` · ${staffMember.designation}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div>
        <StaffPaymentForm
          staffId={id}
          advanceBalance={staffMember.advanceBalance.toNumber()}
          accounts={serialisedAccounts}
        />
      </div>
    </div>
  )
}
