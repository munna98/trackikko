import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatINR, formatDate } from '@/lib/utils'
import { JobActions } from '@/components/jobs/job-actions'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Job Detail' }

const UNIT_LABEL: Record<string, string> = { hours: 'hrs', trips: 'trips', km: 'km' }
const MODE_LABEL: Record<string, string> = { bucket: 'Bucket', breaking: 'Breaking' }

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground min-w-0 flex-shrink-0 w-40">{label}</span>
      <span className="text-sm font-medium text-foreground text-right min-w-0">{value}</span>
    </div>
  )
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const { id } = await params
  const businessId = user.businessId!
  const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'

  const job = await prisma.job.findUnique({
    where: { id, deletedAt: null },
    include: {
      machine: { include: { machineType: true } },
      site: { include: { party: true } },
      staff: { select: { id: true, name: true } },
      recorder: { select: { id: true, name: true } },
    },
  })

  if (!job || job.businessId !== businessId) notFound()

  const trackingUnit = job.machine.machineType.trackingUnit
  const unitLabel = UNIT_LABEL[trackingUnit] ?? trackingUnit

  const dateStr = job.date.toISOString().split('T')[0]
  const defaultEditValues = {
    actualRate: job.actualRate.toNumber(),
    batha: job.batha.toNumber(),
    date: dateStr,
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard/jobs"
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            aria-label="Back to jobs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{job.machine.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatDate(job.date)} · {job.site.party.name} · {job.site.name}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex-shrink-0">
            <JobActions jobId={job.id} defaultValues={defaultEditValues} />
          </div>
        )}
      </div>

      {/* Details card */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <InfoRow label="Party" value={job.site.party.name} />
        <InfoRow label="Site" value={job.site.name} />
        <InfoRow label="Operator" value={job.staff.name} />
        {job.mode && (
          <InfoRow
            label="Mode"
            value={<Badge variant="secondary">{MODE_LABEL[job.mode] ?? job.mode}</Badge>}
          />
        )}
        {job.startReading != null && (
          <InfoRow label="Start Reading" value={`${job.startReading.toNumber().toLocaleString('en-IN')} ${unitLabel}`} />
        )}
        {job.closingReading != null && (
          <InfoRow label="Closing Reading" value={`${job.closingReading.toNumber().toLocaleString('en-IN')} ${unitLabel}`} />
        )}
        {job.tripCount != null && (
          <InfoRow label="Trips" value={job.tripCount.toLocaleString('en-IN')} />
        )}
        <InfoRow
          label={trackingUnit === 'trips' ? 'Trips Worked' : 'Hours Worked'}
          value={`${job.quantity.toNumber().toLocaleString('en-IN')} ${unitLabel}`}
        />
        {job.rateCardRate != null && (
          <InfoRow label="Rate Card Rate" value={formatINR(job.rateCardRate.toNumber())} />
        )}
        <InfoRow
          label="Actual Rate"
          value={
            <span className="font-semibold">
              {formatINR(job.actualRate.toNumber())} / {trackingUnit === 'trips' ? 'trip' : 'hr'}
            </span>
          }
        />
        <InfoRow
          label="Amount"
          value={<span className="text-primary font-bold text-base">{formatINR(job.amount.toNumber())}</span>}
        />
        <InfoRow
          label="Batha"
          value={job.batha.toNumber() > 0 ? <span className="text-chart-5 font-medium">{formatINR(job.batha.toNumber())}</span> : '—'}
        />
        <InfoRow label="Recorded By" value={job.recorder?.name ?? '—'} />
        <InfoRow label="Recorded At" value={job.createdAt.toLocaleString('en-IN')} />
      </div>
    </div>
  )
}
