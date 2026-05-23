import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Staff' }
export default function StaffPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Staff</h1>
      <p className="mt-2 text-muted-foreground">Manage operators, accountants, and admin users in your business.</p>
      <p className="text-sm mt-4 text-muted-foreground/50">Coming in Phase 2</p>
    </div>
  )
}
