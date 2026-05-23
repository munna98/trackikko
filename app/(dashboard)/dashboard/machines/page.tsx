import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Machines' }
export default function MachinesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Machines</h1>
      <p className="mt-2 text-muted-foreground">Manage your excavators, JCBs, tippers and other equipment.</p>
      <p className="text-sm mt-4 text-muted-foreground/50">Coming in Phase 2</p>
    </div>
  )
}
