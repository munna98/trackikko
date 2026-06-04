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
    // P&L totals
    revenueAgg,
    expenseAgg,
    salaryPaidAgg,
    companyBathaAgg,

    // P&L monthly: groupBy day then bucket in JS
    jobsByDay,
    expensesByDay,
    salaryByCreatedAt,
    companyBathaByDay,

    // Party ledger (in-period entries)
    ledgerRaw,
    // Party ledger opening balance: sum debits / credits BEFORE fromDate
    openingDebitsAgg,
    openingCreditsAgg,

    // Machine summary
    jobsByMachine,
    expensesByMachine,
    machines,

    // Staff summary — jobs split by batha payer
    jobsByStaffPartyBatha,
    jobsByStaffCompanyBatha,
    jobsByStaffCount,
    // Staff payments (with full breakdown)
    staffPayments,
    // Salary advances per staff
    salaryAdvancesByStaff,
    // All staff users
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
    // Salary paid total (netPaid = actual cash out)
    prisma.staffPayment.aggregate({
      where: {
        businessId,
        deletedAt: null,
        periodFrom: { gte: fromDate },
        periodTo: { lte: toDate },
      },
      _sum: { netPaid: true },
    }),
    // Company-paid batha total (settled only)
    prisma.job.aggregate({
      where: {
        businessId,
        deletedAt: null,
        date: { gte: fromDate, lte: toDate },
        bathaPaidBy: 'company',
        bathaPaid: true,
      },
      _sum: { batha: true },
    }),

    // ── P&L monthly breakdowns ────────────────────────────────────────────────
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
    // Salary by createdAt (when cash left, not pay period start)
    prisma.staffPayment.findMany({
      where: {
        businessId,
        deletedAt: null,
        periodFrom: { gte: fromDate },
        periodTo: { lte: toDate },
      },
      select: { createdAt: true, netPaid: true },
    }),
    // Company batha by date (settled only)
    prisma.job.groupBy({
      by: ['date'],
      where: {
        businessId,
        deletedAt: null,
        date: { gte: fromDate, lte: toDate },
        bathaPaidBy: 'company',
        bathaPaid: true,
      },
      _sum: { batha: true },
    }),

    // ── Party ledger ─────────────────────────────────────────────────────────
    partyId
      ? prisma.ledgerEntry.findMany({
          where: { businessId, partyId, date: { gte: fromDate, lte: toDate } },
          orderBy: { date: 'asc' },
        })
      : Promise.resolve([]),
    partyId
      ? prisma.ledgerEntry.aggregate({
          where: { businessId, partyId, date: { lt: fromDate }, entryType: 'debit' },
          _sum: { amount: true },
        })
      : Promise.resolve({ _sum: { amount: null } }),
    partyId
      ? prisma.ledgerEntry.aggregate({
          where: { businessId, partyId, date: { lt: fromDate }, entryType: 'credit' },
          _sum: { amount: true },
        })
      : Promise.resolve({ _sum: { amount: null } }),

    // ── Machine summary ───────────────────────────────────────────────────────
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
    // Party-paid batha per staff (informational — party owes staff)
    prisma.job.groupBy({
      by: ['staffId'],
      where: {
        businessId,
        deletedAt: null,
        date: { gte: fromDate, lte: toDate },
        bathaPaidBy: 'party',
      },
      _sum: { batha: true },
      _count: { _all: true },
    }),
    // Company-paid batha per staff (actual company cost)
    prisma.job.groupBy({
      by: ['staffId'],
      where: {
        businessId,
        deletedAt: null,
        date: { gte: fromDate, lte: toDate },
        bathaPaidBy: 'company',
        bathaPaid: true,
      },
      _sum: { batha: true },
    }),
    // Job count per staff (all jobs regardless of batha payer)
    prisma.job.groupBy({
      by: ['staffId'],
      where: { businessId, deletedAt: null, date: { gte: fromDate, lte: toDate } },
      _count: { _all: true },
    }),
    // Staff payments with full breakdown
    prisma.staffPayment.groupBy({
      by: ['staffId'],
      where: {
        businessId,
        deletedAt: null,
        periodFrom: { gte: fromDate },
        periodTo: { lte: toDate },
      },
      _sum: { netPaid: true, advancesDeducted: true, salary: true, bathaTotal: true },
    }),
    // Salary advances per staff
    prisma.salaryAdvance.groupBy({
      by: ['staffId'],
      where: { businessId, deletedAt: null, date: { gte: fromDate, lte: toDate } },
      _sum: { amount: true },
    }),
    // All staff users (union of job-havers + payment-receivers + advance-receivers)
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
  const totalSalaryPaid = salaryPaidAgg._sum.netPaid?.toNumber() ?? 0
  const totalCompanyBatha = companyBathaAgg._sum.batha?.toNumber() ?? 0

  // ── Monthly breakdown: bucket by YYYY-MM ──────────────────────────────────
  const revenueByMonth: Record<string, number> = {}
  for (const row of jobsByDay) {
    const key = new Date(row.date).toISOString().slice(0, 7)
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + (row._sum.amount?.toNumber() ?? 0)
  }

  const expensesByMonth: Record<string, number> = {}
  for (const row of expensesByDay) {
    const key = new Date(row.date).toISOString().slice(0, 7)
    expensesByMonth[key] = (expensesByMonth[key] ?? 0) + (row._sum.amount?.toNumber() ?? 0)
  }

  // Salary: use createdAt for accurate month bucketing
  const salaryByMonth: Record<string, number> = {}
  for (const row of salaryByCreatedAt) {
    const key = new Date(row.createdAt).toISOString().slice(0, 7)
    salaryByMonth[key] = (salaryByMonth[key] ?? 0) + (row.netPaid?.toNumber() ?? 0)
  }

  const companyBathaByMonth: Record<string, number> = {}
  for (const row of companyBathaByDay) {
    const key = new Date(row.date).toISOString().slice(0, 7)
    companyBathaByMonth[key] = (companyBathaByMonth[key] ?? 0) + (row._sum.batha?.toNumber() ?? 0)
  }

  const allMonths = Array.from(
    new Set([
      ...Object.keys(revenueByMonth),
      ...Object.keys(expensesByMonth),
      ...Object.keys(salaryByMonth),
      ...Object.keys(companyBathaByMonth),
    ])
  ).sort((a, b) => b.localeCompare(a))

  const monthlyBreakdown = allMonths.map((month) => ({
    month,
    revenue: revenueByMonth[month] ?? 0,
    expenses: expensesByMonth[month] ?? 0,
    salaryPaid: salaryByMonth[month] ?? 0,
    companyBatha: companyBathaByMonth[month] ?? 0,
  }))

  // ── Party opening balance ─────────────────────────────────────────────────
  const openingBalance = partyId
    ? (openingDebitsAgg._sum.amount?.toNumber() ?? 0) -
      (openingCreditsAgg._sum.amount?.toNumber() ?? 0)
    : 0

  // ── Serialise ledger entries + running balance ────────────────────────────
  let runningBalance = openingBalance
  type LedgerRawRow = (typeof ledgerRaw)[number]
  const ledgerEntries: ReportsClientProps['ledgerEntries'] = ledgerRaw.map(
    (e: LedgerRawRow) => {
      const amt = e.amount.toNumber()
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
    .sort(
      (a: ReportsClientProps['machineSummary'][number], b: ReportsClientProps['machineSummary'][number]) =>
        b.totalRevenue - a.totalRevenue
    )

  // ── Serialise staff summary ───────────────────────────────────────────────
  // Build lookup maps
  const partyBathaMap: Record<string, number> = {}
  for (const row of jobsByStaffPartyBatha) {
    partyBathaMap[row.staffId] = row._sum.batha?.toNumber() ?? 0
  }

  const companyBathaPerStaffMap: Record<string, number> = {}
  for (const row of jobsByStaffCompanyBatha) {
    companyBathaPerStaffMap[row.staffId] = row._sum.batha?.toNumber() ?? 0
  }

  const jobCountMap: Record<string, number> = {}
  for (const row of jobsByStaffCount) {
    jobCountMap[row.staffId] = row._count._all
  }

  const staffPayMap: Record<
    string,
    { netPaid: number; advancesDeducted: number; salary: number; bathaTotal: number }
  > = {}
  for (const row of staffPayments) {
    staffPayMap[row.staffId] = {
      netPaid: row._sum.netPaid?.toNumber() ?? 0,
      advancesDeducted: row._sum.advancesDeducted?.toNumber() ?? 0,
      salary: row._sum.salary?.toNumber() ?? 0,
      bathaTotal: row._sum.bathaTotal?.toNumber() ?? 0,
    }
  }

  const advancesGivenMap: Record<string, number> = {}
  for (const row of salaryAdvancesByStaff) {
    advancesGivenMap[row.staffId] = row._sum.amount?.toNumber() ?? 0
  }

  const staffNameMap: Record<string, string> = {}
  for (const s of staffUsers) staffNameMap[s.id] = s.name

  // Union of all staff IDs that appear in any of the 3 sources
  const allStaffIds = new Set([
    ...jobsByStaffCount.map((r) => r.staffId),
    ...staffPayments.map((r) => r.staffId),
    ...salaryAdvancesByStaff.map((r) => r.staffId),
  ])

  const staffSummary: ReportsClientProps['staffSummary'] = Array.from(allStaffIds)
    .map((staffId) => ({
      staffId,
      staffName: staffNameMap[staffId] ?? staffId,
      jobCount: jobCountMap[staffId] ?? 0,
      partyBatha: partyBathaMap[staffId] ?? 0,
      companyBatha: companyBathaPerStaffMap[staffId] ?? 0,
      salary: (staffPayMap[staffId]?.salary ?? 0) - (staffPayMap[staffId]?.advancesDeducted ?? 0),
      bathaSettled: staffPayMap[staffId]?.bathaTotal ?? 0,
      advancesGiven: advancesGivenMap[staffId] ?? 0,
      netPaid: staffPayMap[staffId]?.netPaid ?? 0,
    }))
    .sort((a, b) => b.netPaid - a.netPaid || a.staffName.localeCompare(b.staffName))

  // ── Filter options ────────────────────────────────────────────────────────
  const parties = partiesAll.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))
  const machineOptions = machines.map((m: { id: string; name: string }) => ({ id: m.id, name: m.name }))

  return (
    <ReportsClient
      totalRevenue={totalRevenue}
      totalExpenses={totalExpenses}
      totalSalaryPaid={totalSalaryPaid}
      totalCompanyBatha={totalCompanyBatha}
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
