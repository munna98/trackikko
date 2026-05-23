import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatINR } from '@/lib/utils'
import { Truck, Users, Building2, Wallet, Activity, Wrench } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user?.businessId) {
    redirect('/login')
  }

  const businessId = user.businessId

  // Fetch all stats in parallel
  const [machineCount, staffCount, parties, accounts] = await Promise.all([
    prisma.machine.count({
      where: { businessId, deletedAt: null, isActive: true },
    }),
    prisma.user.count({
      where: { businessId, deletedAt: null, isActive: true },
    }),
    prisma.party.findMany({
      where: { businessId, deletedAt: null },
      select: { runningBalance: true },
    }),
    prisma.account.findMany({
      where: { businessId, deletedAt: null, isActive: true },
      select: { currentBalance: true },
    }),
  ])

  const outstanding = parties
    .filter((p) => p.runningBalance.toNumber() > 0)
    .reduce((sum, p) => sum + p.runningBalance.toNumber(), 0)

  const cashPosition = accounts.reduce(
    (sum, a) => sum + a.currentBalance.toNumber(),
    0
  )

  const statCards = [
    {
      id: 'stat-machines',
      title: 'Total Machines',
      value: machineCount.toString(),
      icon: Truck,
      accent: 'oklch(0.76 0.14 75)',
      sub: 'active fleet',
    },
    {
      id: 'stat-staff',
      title: 'Active Staff',
      value: staffCount.toString(),
      icon: Users,
      accent: 'oklch(0.70 0.16 160)',
      sub: 'team members',
    },
    {
      id: 'stat-outstanding',
      title: 'Outstanding',
      value: formatINR(outstanding),
      icon: Building2,
      accent: 'oklch(0.70 0.18 30)',
      sub: 'from parties',
    },
    {
      id: 'stat-cash',
      title: 'Cash Position',
      value: formatINR(cashPosition),
      icon: Wallet,
      accent: 'oklch(0.72 0.16 200)',
      sub: 'across accounts',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'oklch(0.94 0.03 75)' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'oklch(0.60 0.04 60)' }}>
          Welcome back, {user.name.split(' ')[0]} 👋
        </p>
      </div>

      {/* Stat cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ id, title, value, icon: Icon, accent, sub }) => (
          <div
            key={id}
            id={id}
            className="rounded-2xl border p-4 flex flex-col gap-3"
            style={{
              background: 'oklch(0.17 0.04 45)',
              borderColor: 'oklch(0.25 0.05 48)',
            }}
          >
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'oklch(0.60 0.04 60)' }}>
                {title}
              </p>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${accent}20` }}
              >
                <Icon className="w-4 h-4" style={{ color: accent }} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight" style={{ color: 'oklch(0.94 0.03 75)' }}>
                {value}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0.04 60)' }}>
                {sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div
          className="rounded-2xl border p-5"
          style={{
            background: 'oklch(0.17 0.04 45)',
            borderColor: 'oklch(0.25 0.05 48)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4" style={{ color: 'oklch(0.76 0.14 75)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'oklch(0.90 0.03 70)' }}>
              Recent Activity
            </h2>
          </div>
          <div
            className="flex flex-col items-center justify-center py-8 rounded-xl"
            style={{ background: 'oklch(0.15 0.03 48)' }}
          >
            <ClipboardEmpty />
            <p className="text-sm mt-3" style={{ color: 'oklch(0.55 0.04 60)' }}>
              Start logging jobs to see activity here
            </p>
          </div>
        </div>

        {/* Service Alerts */}
        <div
          className="rounded-2xl border p-5"
          style={{
            background: 'oklch(0.17 0.04 45)',
            borderColor: 'oklch(0.25 0.05 48)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-4 h-4" style={{ color: 'oklch(0.70 0.18 30)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'oklch(0.90 0.03 70)' }}>
              Service Alerts
            </h2>
          </div>
          <div
            className="flex flex-col items-center justify-center py-8 rounded-xl"
            style={{ background: 'oklch(0.15 0.03 48)' }}
          >
            <OilCanEmpty />
            <p className="text-sm mt-3" style={{ color: 'oklch(0.55 0.04 60)' }}>
              Oil change alerts will appear here
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ClipboardEmpty() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="oklch(0.40 0.04 55)" strokeWidth="1.5">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="12" y2="16" />
    </svg>
  )
}

function OilCanEmpty() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="oklch(0.40 0.04 55)" strokeWidth="1.5">
      <path d="M3 12h1l2-7h10l2 7h1" />
      <path d="M3 12v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6" />
      <line x1="12" y1="5" x2="12" y2="2" />
    </svg>
  )
}
