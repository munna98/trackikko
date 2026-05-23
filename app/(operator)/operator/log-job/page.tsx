import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Log Job' }
export default function LogJobPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Log Job</h1>
      <p className="mt-2 text-muted-foreground">Record your daily machine hours, trips, or kilometres.</p>
      <p className="text-sm mt-4 text-muted-foreground/50">Coming in Phase 2</p>
    </div>
  )
}
