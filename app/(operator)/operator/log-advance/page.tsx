import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Log Advance' }
export default function LogAdvancePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Log Advance</h1>
      <p className="mt-2 text-muted-foreground">Record a party advance collected on site.</p>
      <p className="text-sm mt-4 text-muted-foreground/50">Coming in Phase 2</p>
    </div>
  )
}
