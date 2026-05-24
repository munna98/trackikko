'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Wallet, Building2, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AccountDialog } from '@/components/settings/account-dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { formatINR } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Account = {
  id: string
  name: string
  type: 'cash' | 'bank'
  openingBalance: number
  currentBalance: number
  isActive: boolean
}

type Props = {
  accounts: Account[]
  isAdmin: boolean
  cash: Account[]
  bank: Account[]
}

function AccountCard({ account, isAdmin }: { account: Account; isAdmin: boolean }) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const canDeactivate = account.isActive && account.currentBalance === 0

  async function handleDeactivate() {
    setLoading(true)
    await fetch(`/api/settings/accounts/${account.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })
    setLoading(false)
    setConfirmOpen(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
        account.type === 'cash' ? 'bg-chart-5/15' : 'bg-primary/10'
      )}>
        {account.type === 'cash'
          ? <Wallet className="w-5 h-5 text-chart-5" />
          : <Building2 className="w-5 h-5 text-primary" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-foreground truncate">{account.name}</p>
          <Badge variant="outline" className="text-xs capitalize">{account.type}</Badge>
          {!account.isActive && (
            <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Opening: {formatINR(account.openingBalance)}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={cn(
          'text-lg font-bold',
          account.currentBalance >= 0 ? 'text-chart-5' : 'text-destructive'
        )}>
          {formatINR(account.currentBalance)}
        </p>
        {isAdmin && account.isActive && (
          <div className="flex gap-2 mt-1 justify-end">
            <AccountDialog defaultValues={account} />
            {canDeactivate && (
              <>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="text-xs text-destructive hover:underline"
                  id={`deactivate-account-${account.id}`}
                >
                  Deactivate
                </button>
                <ConfirmDialog
                  open={confirmOpen}
                  onOpenChange={setConfirmOpen}
                  title="Deactivate Account?"
                  description="This account will be marked inactive. It cannot be used for new transactions."
                  confirmLabel="Deactivate"
                  variant="destructive"
                  onConfirm={handleDeactivate}
                  loading={loading}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function AccountsClient({ accounts, isAdmin, cash, bank }: Props) {
  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No accounts yet"
        description="Add a cash or bank account to start tracking finances."
        action={isAdmin ? <AccountDialog /> : undefined}
      />
    )
  }

  return (
    <div className="space-y-6">
      {cash.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cash Accounts</h3>
          <div className="space-y-2">
            {cash.map((a) => <AccountCard key={a.id} account={a} isAdmin={isAdmin} />)}
          </div>
        </div>
      )}
      {cash.length > 0 && bank.length > 0 && <Separator />}
      {bank.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Bank Accounts</h3>
          <div className="space-y-2">
            {bank.map((a) => <AccountCard key={a.id} account={a} isAdmin={isAdmin} />)}
          </div>
        </div>
      )}
    </div>
  )
}
