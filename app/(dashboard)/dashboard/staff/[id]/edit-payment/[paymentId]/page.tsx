import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StaffPaymentForm } from '@/components/staff/staff-payment-form'
import { ArrowLeft } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import type { Metadata } from 'next'

type PageProps = { params: Promise<{ id: string; paymentId: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const member = await prisma.user.findUnique({ where: { id }, select: { name: true } })
  return { title: `Edit Payment – ${member?.name ?? 'Staff'}` }
}

export default async function EditPaymentPage({ params }: PageProps) {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  // Admin-only page
  const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'
  if (!isAdmin) redirect('/dashboard')

  const { id, paymentId } = await params
  const businessId = user.businessId!

  const [staffMember, accounts, payment] = await Promise.all([
    prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        designation: true,
        businessId: true,
        advanceBalance: true,
        baseSalary: true,
      },
    }),
    prisma.account.findMany({
      where: { businessId, deletedAt: null, isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    }),
    prisma.staffPayment.findUnique({
      where: { id: paymentId, deletedAt: null },
    }),
  ])

  if (!staffMember || staffMember.businessId !== businessId) notFound()
  if (!payment || payment.staffId !== id || payment.businessId !== businessId) notFound()

  type AccountRow = (typeof accounts)[number]
  const serialisedAccounts = accounts.map((a: AccountRow) => ({
    id: a.id,
    name: a.name,
    type: a.type as string,
  }))

  const editPayment = {
    id: payment.id,
    periodFrom: payment.periodFrom.toISOString().split('T')[0],
    periodTo: payment.periodTo.toISOString().split('T')[0],
    daysWorked: payment.daysWorked,
    bathaTotal: payment.bathaTotal?.toNumber() ?? 0,
    salary: payment.salary.toNumber(),
    advancesDeducted: payment.advancesDeducted?.toNumber() ?? 0,
    netPaid: payment.netPaid.toNumber(),
    accountId: payment.accountId,
    notes: payment.notes,
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/staff/${id}`}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Back to staff detail"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0 bg-primary/20 text-primary">
            {getInitials(staffMember.name)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">
              Edit Payment
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
          baseSalary={staffMember.baseSalary ? staffMember.baseSalary.toNumber() : undefined}
          accounts={serialisedAccounts}
          editPayment={editPayment}
        />
      </div>
    </div>
  )
}
