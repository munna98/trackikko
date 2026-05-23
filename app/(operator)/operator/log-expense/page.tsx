import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Log Expense' }
export default function LogExpensePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Log Expense</h1>
      <p className="mt-2 text-muted-foreground">Record fuel, oil changes, spare parts, and other expenses.</p>
      <p className="text-sm mt-4 text-muted-foreground/50">Coming in Phase 2</p>
    </div>
  )
}
