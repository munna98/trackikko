import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatINR } from '@/lib/utils'
import { Truck, Users, Building2, Wallet, Activity, Wrench } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const businessId = user.businessId

  const [machineCount, staffCount, parties, accounts] = await Promise.all([
    prisma.machine.count({ where: { businessId, deletedAt: null, isActive: true } }),
    prisma.user.count({ where: { businessId, deletedAt: null, isActive: true } }),
    prisma.party.findMany({ where: { businessId, deletedAt: null }, select: { runningBalance: true } }),
    prisma.account.findMany({ where: { businessId, deletedAt: null, isActive: true }, select: { currentBalance: true } }),
  ])

  const outstanding = parties.filter(p => p.runningBalance.toNumber() > 0).reduce((s, p) => s + p.runningBalance.toNumber(), 0)
  const cashPosition = accounts.reduce((s, a) => s + a.currentBalance.toNumber(), 0)

  const statCards = [
    { id: 'stat-machines',    title: 'Total Machines',  value: machineCount.toString(),  icon: Truck,     sub: 'active fleet',     color: 'text-chart-1' },
    { id: 'stat-staff',       title: 'Active Staff',    value: staffCount.toString(),    icon: Users,     sub: 'team members',     color: 'text-chart-5' },
    { id: 'stat-outstanding', title: 'Outstanding',     value: formatINR(outstanding),   icon: Building2, sub: 'from parties',     color: 'text-destructive' },
    { id: 'stat-cash',        title: 'Cash Position',   value: formatINR(cashPosition),  icon: Wallet,    sub: 'across accounts',  color: 'text-chart-2' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm mt-0.5 text-muted-foreground">Welcome back, {user.name.split(' ')[0]} 👋</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ id, title, value, icon: Icon, sub, color }) => (
          <div key={id} id={id} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-card-foreground">{value}</p>
              <p className="text-xs mt-0.5 text-muted-foreground">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm text-card-foreground">Recent Activity</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-8 rounded-xl bg-muted">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="12" y2="16" />
            </svg>
            <p className="text-sm mt-3 text-muted-foreground">Start logging jobs to see activity here</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-4 h-4 text-destructive" />
            <h2 className="font-semibold text-sm text-card-foreground">Service Alerts</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-8 rounded-xl bg-muted">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40">
              <path d="M3 12h1l2-7h10l2 7h1" /><path d="M3 12v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6" />
              <line x1="12" y1="5" x2="12" y2="2" />
            </svg>
            <p className="text-sm mt-3 text-muted-foreground">Oil change alerts will appear here</p>
          </div>
        </div>
      </div>
    </div>
  )
}
