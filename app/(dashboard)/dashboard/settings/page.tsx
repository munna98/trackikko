import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Settings' }
export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      <p className="mt-2 text-muted-foreground">Configure your business, accounts, machine types, and expense categories.</p>
      <p className="text-sm mt-4 text-muted-foreground/50">Coming in Phase 2</p>
    </div>
  )
}
