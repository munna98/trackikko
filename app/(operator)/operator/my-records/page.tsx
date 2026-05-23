import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'My Records' }
export default function MyRecordsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">My Records</h1>
      <p className="mt-2 text-muted-foreground">View your job history, expenses, and earnings summary.</p>
      <p className="text-sm mt-4 text-muted-foreground/50">Coming in Phase 2</p>
    </div>
  )
}
