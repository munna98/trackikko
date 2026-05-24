'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, MapPin, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PartySheet } from '@/components/parties/party-sheet'
import { formatINR } from '@/lib/utils'

type Party = {
  id: string
  name: string
  mobile?: string
  address?: string
  gstNo?: string
  openingBalance: number
  runningBalance: number
  isActive: boolean
  siteCount: number
}

type Props = {
  parties: Party[]
  isAdmin: boolean
}

function BalanceDisplay({ balance }: { balance: number }) {
  if (balance === 0) return <span className="text-muted-foreground text-sm">Settled</span>
  if (balance > 0) return (
    <span className="text-destructive font-semibold text-sm">
      {formatINR(balance)} <span className="text-xs font-normal">Dr</span>
    </span>
  )
  return (
    <span className="text-amber-500 font-semibold text-sm">
      {formatINR(Math.abs(balance))} <span className="text-xs font-normal">Cr</span>
    </span>
  )
}

export function PartiesListClient({ parties, isAdmin }: Props) {
  const [search, setSearch] = React.useState('')
  const router = useRouter()

  const filtered = parties.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search parties…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          id="parties-search"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={search ? 'No parties match your search' : 'No parties added yet'}
          description={search ? 'Try a different search term.' : 'Add your first party to start managing clients and contractors.'}
          action={!search && isAdmin ? <PartySheet /> : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((party) => (
            <div
              key={party.id}
              className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3 hover:bg-accent/30 transition-colors cursor-pointer"
              onClick={() => router.push(`/dashboard/parties/${party.id}`)}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`/dashboard/parties/${party.id}`)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{party.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {party.gstNo && (
                      <span className="text-xs text-muted-foreground">{party.gstNo}</span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {party.siteCount} {party.siteCount === 1 ? 'site' : 'sites'}
                    </span>
                    {!party.isActive && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <BalanceDisplay balance={party.runningBalance} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
