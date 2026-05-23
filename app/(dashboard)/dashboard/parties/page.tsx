import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Parties & Sites' }
export default function PartiesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Parties &amp; Sites</h1>
      <p className="mt-2 text-muted-foreground">Manage clients, contractors, and their project sites.</p>
      <p className="text-sm mt-4 text-muted-foreground/50">Coming in Phase 2</p>
    </div>
  )
}
