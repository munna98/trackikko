import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ReportsClient } from '@/components/reports/reports-client'
import type { ReportsClientProps } from '@/components/reports/reports-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reports' }

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const businessId = user.businessId!
  const params = await searchParams

  // ── Active report tab ───────────────────────────────────────────────────────
  const report =
    typeof params.report === 'string' ? params.report : 'pl'

  // ── Date range (default: current calendar month → today) ───────────────────
  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const defaultTo = now.toISOString().split('T')[0]

  const fromStr = typeof params.from === 'string' ? params.from : defaultFrom
  const toStr = typeof params.to === 'string' ? params.to : defaultTo
  const partyId = typeof params.partyId === 'string' ? params.partyId : ''

  const fromDate = new Date(fromStr)
  const toDate = new Date(toStr)

  // ── Parallel data fetch ────────────────────────────────────────────────────
  const [
    revenueAgg,
    expenseAgg,
    // P&L monthly: groupBy day then bucket in JS
    jobsByDay,
    expensesByDay,
    // Party ledger (in-period entries)
    ledgerRaw,
    // Party ledger opening balance: sum debits / credits BEFORE fromDate
    openingDebitsAgg,
    openingCreditsAgg,
    // Machine summary
    jobsByMachine,
    expensesByMachine,
    machines,
    // Staff summary
    jobsByStaff,
    staffPayments,
    staffUsers,
    // Filter options
    partiesAll,
  ] = await Promise.all([
    // ── P&L totals ────────────────────────────────────────────────────────────
    prisma.job.aggregate({
      where: { businessId, deletedAt: null, date: { gte: fromDate, lte: toDate } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { businessId, deletedAt: null, date: { gte: fromDate, lte: toDate } },
      _sum: { amount: true },
    }),

    // ── P&L monthly breakdown (groupBy exact date, merge by YYYY-MM in JS) ───
    prisma.job.groupBy({
      by: ['date'],
      where: { businessId, deletedAt: null, date: { gte: fromDate, lte: toDate } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ['date'],
      where: { businessId, deletedAt: null, date: { gte: fromDate, lte: toDate } },
      _sum: { amount: true },
    }),

    // ── Party ledger (in-period entries) ─────────────────────────────────────
    partyId
      ? prisma.ledgerEntry.findMany({
          where: { businessId, partyId, date: { gte: fromDate, lte: toDate } },
          orderBy: { date: 'asc' },
        })
      : Promise.resolve([]),

    // ── Party opening balance: all debits before fromDate ─────────────────────
    partyId
      ? prisma.ledgerEntry.aggregate({
          where: { businessId, partyId, date: { lt: fromDate }, entryType: 'debit' },
          _sum: { amount: true },
        })
      : Promise.resolve({ _sum: { amount: null } }),

    // ── Party opening balance: all credits before fromDate ────────────────────
    partyId
      ? prisma.ledgerEntry.aggregate({
          where: { businessId, partyId, date: { lt: fromDate }, entryType: 'credit' },
          _sum: { amount: true },
        })
      : Promise.resolve({ _sum: { amount: null } }),

    // ── Machine revenue summary ───────────────────────────────────────────────
    prisma.job.groupBy({
      by: ['machineId'],
      where: { businessId, deletedAt: null, date: { gte: fromDate, lte: toDate } },
      _sum: { amount: true, quantity: true },
      _count: { _all: true },
    }),
    prisma.expense.groupBy({
      by: ['machineId'],
      where: {
        businessId,
        deletedAt: null,
        date: { gte: fromDate, lte: toDate },
        machineId: { not: null },
      },
      _sum: { amount: true },
    }),
    prisma.machine.findMany({
      where: { businessId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),

    // ── Staff summary ─────────────────────────────────────────────────────────
    prisma.job.groupBy({
      by: ['staffId'],
      where: { businessId, deletedAt: null, date: { gte: fromDate, lte: toDate } },
      _sum: { batha: true },
      _count: { _all: true },
    }),
    // staffPayments filtered by pay period overlapping selected date range
    prisma.staffPayment.groupBy({
      by: ['staffId'],
      where: {
        businessId,
        deletedAt: null,
        periodFrom: { gte: fromDate },
        periodTo: { lte: toDate },
      },
      _sum: { netPaid: true, advancesDeducted: true },
    }),
    prisma.user.findMany({
      where: { businessId, deletedAt: null, roleId: { not: 'master_admin' } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),

    // ── Filter options ────────────────────────────────────────────────────────
    prisma.party.findMany({
      where: { businessId, deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  // ── Serialise P&L totals ───────────────────────────────────────────────────
  const totalRevenue = revenueAgg._sum.amount?.toNumber() ?? 0
  const totalExpenses = expenseAgg._sum.amount?.toNumber() ?? 0

  // ── Monthly breakdown: bucket by YYYY-MM ──────────────────────────────────
  const revenueByMonth: Record<string, number> = {}
  for (const row of jobsByDay) {
    const key = new Date(row.date).toISOString().slice(0, 7) // "YYYY-MM"
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + (row._sum.amount?.toNumber() ?? 0)
  }
  const expensesByMonth: Record<string, number> = {}
  for (const row of expensesByDay) {
    const key = new Date(row.date).toISOString().slice(0, 7)
    expensesByMonth[key] = (expensesByMonth[key] ?? 0) + (row._sum.amount?.toNumber() ?? 0)
  }
  const allMonths = Array.from(
    new Set([...Object.keys(revenueByMonth), ...Object.keys(expensesByMonth)])
  ).sort()
  const monthlyBreakdown = allMonths.map((month) => ({
    month,
    revenue: revenueByMonth[month] ?? 0,
    expenses: expensesByMonth[month] ?? 0,
  }))

  // ── Party opening balance (balance before fromDate) ──────────────────────
  const openingBalance = partyId
    ? (openingDebitsAgg._sum.amount?.toNumber() ?? 0) -
      (openingCreditsAgg._sum.amount?.toNumber() ?? 0)
    : 0

  // ── Serialise ledger entries + compute running balance ────────────────────
  // Running balance starts from the opening balance so context is preserved
  // even when the date range doesn't include older job/advance entries.
  let runningBalance = openingBalance
  type LedgerRawRow = (typeof ledgerRaw)[number]
  const ledgerEntries: ReportsClientProps['ledgerEntries'] = ledgerRaw.map(
    (e: LedgerRawRow) => {
      const amt = e.amount.toNumber()
      // debit = party owes more (job billed), credit = reduces outstanding
      if (e.entryType === 'debit') runningBalance += amt
      else runningBalance -= amt
      return {
        id: e.id,
        date: e.date.toISOString(),
        type: e.type,
        entryType: e.entryType,
        amount: amt,
        description: e.description,
        runningBalance,
      }
    }
  )

  // ── Serialise machine summary ─────────────────────────────────────────────
  const expByMachineMap: Record<string, number> = {}
  for (const row of expensesByMachine) {
    if (row.machineId) {
      expByMachineMap[row.machineId] = row._sum.amount?.toNumber() ?? 0
    }
  }
  const machineNameMap: Record<string, string> = {}
  for (const m of machines) machineNameMap[m.id] = m.name

  type JobByMachineRow = (typeof jobsByMachine)[number]
  const machineSummary: ReportsClientProps['machineSummary'] = jobsByMachine
    .map((row: JobByMachineRow) => ({
      machineId: row.machineId,
      machineName: machineNameMap[row.machineId] ?? row.machineId,
      jobCount: row._count._all,
      totalQty: row._sum.quantity?.toNumber() ?? 0,
      totalRevenue: row._sum.amount?.toNumber() ?? 0,
      totalExpenses: expByMachineMap[row.machineId] ?? 0,
    }))
    .sort((a: ReportsClientProps['machineSummary'][number], b: ReportsClientProps['machineSummary'][number]) => b.totalRevenue - a.totalRevenue)

  // ── Serialise staff summary ───────────────────────────────────────────────
  const staffPayMap: Record<string, { netPaid: number; advancesDeducted: number }> = {}
  for (const row of staffPayments) {
    staffPayMap[row.staffId] = {
      netPaid: row._sum.netPaid?.toNumber() ?? 0,
      advancesDeducted: row._sum.advancesDeducted?.toNumber() ?? 0,
    }
  }
  const staffNameMap: Record<string, string> = {}
  for (const s of staffUsers) staffNameMap[s.id] = s.name

  type JobByStaffRow = (typeof jobsByStaff)[number]
  const staffSummary: ReportsClientProps['staffSummary'] = jobsByStaff
    .map((row: JobByStaffRow) => ({
      staffId: row.staffId,
      staffName: staffNameMap[row.staffId] ?? row.staffId,
      jobCount: row._count._all,
      bathaEarned: row._sum.batha?.toNumber() ?? 0,
      netPaid: staffPayMap[row.staffId]?.netPaid ?? 0,
      advancesDeducted: staffPayMap[row.staffId]?.advancesDeducted ?? 0,
    }))
    .sort((a: ReportsClientProps['staffSummary'][number], b: ReportsClientProps['staffSummary'][number]) => b.bathaEarned - a.bathaEarned)

  // ── Filter options ────────────────────────────────────────────────────────
  const parties = partiesAll.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))
  const machineOptions = machines.map((m: { id: string; name: string }) => ({ id: m.id, name: m.name }))

  return (
    <ReportsClient
      totalRevenue={totalRevenue}
      totalExpenses={totalExpenses}
      monthlyBreakdown={monthlyBreakdown}
      ledgerEntries={ledgerEntries}
      openingBalance={openingBalance}
      machineSummary={machineSummary}
      staffSummary={staffSummary}
      parties={parties}
      machines={machineOptions}
      currentReport={report}
      currentFrom={fromStr}
      currentTo={toStr}
      currentPartyId={partyId}
      defaultFrom={defaultFrom}
      defaultTo={defaultTo}
    />
  )
}
