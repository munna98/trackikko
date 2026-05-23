import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Jobs' }
export default function JobsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
      <p className="mt-2 text-muted-foreground">View and manage all job entries across machines, operators, and sites.</p>
      <p className="text-sm mt-4 text-muted-foreground/50">Coming in Phase 2</p>
    </div>
  )
}
