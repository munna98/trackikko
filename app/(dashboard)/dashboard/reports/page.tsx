import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Reports' }
export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Reports</h1>
      <p className="mt-2 text-muted-foreground">Financial and operational reports — P&amp;L, party ledgers, machine summaries.</p>
      <p className="text-sm mt-4 text-muted-foreground/50">Coming in Phase 2</p>
    </div>
  )
}
