import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Master Admin' }
export default function MasterPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Master Admin</h1>
      <p className="mt-2 text-muted-foreground">Manage all businesses, users, machine types, and global configuration.</p>
      <p className="text-sm mt-4 text-muted-foreground/50">Coming in Phase 2</p>
    </div>
  )
}
