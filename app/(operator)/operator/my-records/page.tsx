import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'My Records' }
export default function MyRecordsPage() {
  return (
    <div className="p-2">
      <h1 className="text-2xl font-bold" style={{ color: 'oklch(0.94 0.03 75)' }}>My Records</h1>
      <p className="mt-2" style={{ color: 'oklch(0.65 0.05 65)' }}>View your job history, expenses, and earnings summary.</p>
      <p className="text-sm mt-4" style={{ color: 'oklch(0.50 0.04 60)' }}>Coming in Phase 2</p>
    </div>
  )
}
