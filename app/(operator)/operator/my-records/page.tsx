import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatINR, formatDate } from '@/lib/utils'
import { ClipboardList } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Records' }

const UNIT_LABEL: Record<string, string> = { hours: 'hrs', trips: 'trips', km: 'km' }
const MODE_LABEL: Record<string, string> = { bucket: 'Bucket', breaking: 'Breaking' }

export default async function MyRecordsPage() {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const businessId = user.businessId!
  const staffId = user.id

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const jobs = await prisma.job.findMany({
    where: { staffId, businessId, deletedAt: null },
    include: {
      machine: { include: { machineType: true } },
      site: { include: { party: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  type JobRow = (typeof jobs)[number]

  const thisMonthJobs = jobs.filter((j: JobRow) => {
    const d = new Date(j.date)
    return d >= monthStart && d <= monthEnd
  })

  const monthlyJobCount = thisMonthJobs.length
  const monthlyBatha = thisMonthJobs.reduce((s: number, j: JobRow) => s + j.batha.toNumber(), 0)

  const serialJobs = jobs.map((j: JobRow) => ({
    id: j.id,
    date: j.date.toISOString(),
    machineName: j.machine.name,
    trackingUnit: j.machine.machineType.trackingUnit,
    partyName: j.site.party.name,
    siteName: j.site.name,
    mode: j.mode,
    quantity: j.quantity.toNumber(),
    amount: j.amount.toNumber(),
    batha: j.batha.toNumber(),
    bathaPaidBy: j.bathaPaidBy,
  }))

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Records</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your job history and monthly summary.</p>
      </div>

      {/* Monthly summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Jobs</p>
          <p className="text-2xl font-bold text-card-foreground">{monthlyJobCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">this month</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Batha</p>
          <p className="text-xl font-bold text-chart-5">{formatINR(monthlyBatha)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">this month</p>
        </div>
      </div>

      {/* Job list */}
      {serialJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/50 px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <ClipboardList className="h-7 w-7 text-muted-foreground/60" />
          </div>
          <p className="text-base font-semibold text-foreground">No jobs yet</p>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
            Start logging jobs to see your history here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {serialJobs.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-card-foreground truncate">{job.machineName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {job.partyName} · {job.siteName}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {formatDate(job.date)}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                {job.mode && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                    {MODE_LABEL[job.mode] ?? job.mode}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {job.quantity.toLocaleString('en-IN')} {UNIT_LABEL[job.trackingUnit] ?? job.trackingUnit}
                </span>
                {job.batha > 0 && (
                  <span className={`ml-auto text-xs font-semibold ${job.bathaPaidBy === 'company' ? 'text-destructive' : 'text-chart-5'}`}>
                    +{formatINR(job.batha)}{' '}
                    <span className="text-[10px] text-muted-foreground font-normal">
                      ({job.bathaPaidBy === 'company' ? 'Company' : 'Party'})
                    </span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
