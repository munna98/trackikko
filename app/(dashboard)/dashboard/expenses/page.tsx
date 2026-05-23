import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Expenses' }
export default function ExpensesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
      <p className="mt-2 text-muted-foreground">Track fuel, oil, spare parts, and other operating expenses.</p>
      <p className="text-sm mt-4 text-muted-foreground/50">Coming in Phase 2</p>
    </div>
  )
}
