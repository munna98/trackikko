'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin, Tag, BookOpen, CheckCircle, Pencil } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SiteDialog } from '@/components/parties/site-dialog'
import { RateCardDialog } from '@/components/parties/rate-card-dialog'
import { EditRateDialog } from '@/components/parties/edit-rate-dialog'
import { PartySettlementDialog } from '@/components/parties/party-settlement-dialog'
import { PartyAdvanceDialog } from '@/components/parties/party-advance-dialog'
import { formatINR, formatDate } from '@/lib/utils'

type Site = {
  id: string
  name: string
  location?: string
  batha: number
  isActive: boolean
}

type RateCard = {
  id: string
  machineName: string
  siteName: string | null
  mode: string | null
  rateType: string
  rate: number
  isActive: boolean
}

type Machine = {
  id: string
  name: string
  trackingUnit: 'hours' | 'trips' | 'km'
  hasModes: boolean
}

type AccountOption = { id: string; name: string; type: string }

type PartySettlementRow = {
  id: string
  date: string
  balanceBefore: number
  amountReceived: number
  writeoffAmount: number
  accountName: string
  notes: string | null
}

type PartyAdvanceRow = {
  id: string
  date: string
  amount: number
  accountName: string
  notes: string | null
}

type PartyTabsProps = {
  partyId: string
  sites: Site[]
  rateCards: RateCard[]
  machines: Machine[]
  isAdmin: boolean
  settlements: PartySettlementRow[]
  advances: PartyAdvanceRow[]
  accounts: AccountOption[]
  runningBalance: number
}

function ModePill({ mode }: { mode: string | null }) {
  if (!mode) return <span className="text-muted-foreground text-sm">—</span>
  if (mode === 'bucket') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-chart-5/10 text-chart-5">
        Bucket
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      Breaking
    </span>
  )
}

export function PartyTabs({
  partyId,
  sites,
  rateCards,
  machines,
  isAdmin,
  settlements,
  advances,
  accounts,
  runningBalance,
}: PartyTabsProps) {
  const router = useRouter()
  const [togglingId, setTogglingId] = React.useState<string | null>(null)
  const [toggleTarget, setToggleTarget] = React.useState<boolean>(false)
  const [confirmSiteOpen, setConfirmSiteOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const rateCardsByMachine = React.useMemo(() =>
    rateCards.reduce((acc, rc) => {
      if (!acc[rc.machineName]) acc[rc.machineName] = []
      acc[rc.machineName].push(rc)
      return acc
    }, {} as Record<string, RateCard[]>),
    [rateCards]
  )

  async function handleToggleSite() {
    if (!togglingId) return
    setLoading(true)
    await fetch(`/api/parties/${partyId}/sites/${togglingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: toggleTarget }),
    })
    setLoading(false)
    setConfirmSiteOpen(false)
    setTogglingId(null)
    router.refresh()
  }

  return (
    <Tabs defaultValue="sites" className="flex-col">
      <TabsList className="w-full h-auto flex-wrap justify-start gap-0.5 p-1">
        <TabsTrigger value="sites">Sites</TabsTrigger>
        <TabsTrigger value="rate-cards">Rate Cards</TabsTrigger>
        <TabsTrigger value="advances">
          Advances
          {advances.length > 0 && (
            <span className="ml-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5 leading-none">
              {advances.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="ledger">Ledger</TabsTrigger>
        <TabsTrigger value="settlements">
          Settlements
          {settlements.length > 0 && (
            <span className="ml-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5 leading-none">
              {settlements.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ── Sites Tab ─────────────────────────────────────────── */}
      <TabsContent value="sites">
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <SiteDialog partyId={partyId} />
            </div>
          )}
          {sites.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No sites added yet"
              description="Add sites to this party to track work locations."
              action={isAdmin ? <SiteDialog partyId={partyId} /> : undefined}
            />
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Location</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Batha</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    {isAdmin && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sites.map((site) => (
                    <tr key={site.id} className="bg-card hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{site.name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {site.location ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {site.batha > 0 ? (
                          <>{formatINR(site.batha)}<span className="text-xs font-normal text-muted-foreground ml-1">/ day</span></>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={site.isActive ? 'secondary' : 'outline'} className={!site.isActive ? 'text-muted-foreground' : ''}>
                          {site.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <SiteDialog
                              partyId={partyId}
                              defaultValues={site}
                              trigger={
                                <Button size="sm" variant="ghost" id={`edit-site-${site.id}`}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              }
                            />
                            {site.isActive ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive text-xs"
                                onClick={() => { setTogglingId(site.id); setToggleTarget(false); setConfirmSiteOpen(true) }}
                              >
                                Deactivate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-chart-5 hover:text-chart-5 text-xs"
                                onClick={() => { setTogglingId(site.id); setToggleTarget(true); setConfirmSiteOpen(true) }}
                              >
                                Activate
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── Rate Cards Tab ────────────────────────────────────── */}
      <TabsContent value="rate-cards">
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <RateCardDialog partyId={partyId} machines={machines} sites={sites} />
            </div>
          )}

          {rateCards.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No rate cards set"
              description="Add rate cards to define billing rates for this party."
              action={isAdmin ? <RateCardDialog partyId={partyId} machines={machines} sites={sites} /> : undefined}
            />
          ) : (
            <div className="space-y-3">
              {Object.entries(rateCardsByMachine).map(([machineName, cards]) => {
                const rateUnit = cards[0].rateType === 'per_trip' ? 'trip' : 'hr'
                return (
                  <div key={machineName} className="rounded-xl border border-border overflow-hidden">
                    {/* Machine header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b border-border">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground">{machineName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {cards[0].rateType === 'per_trip' ? 'per trip' : 'per hour'}
                          {' · '}{cards.length} {cards.length === 1 ? 'rate' : 'rates'}
                        </p>
                      </div>
                    </div>

                    {/* Rate rows */}
                    <div className="divide-y divide-border">
                      {cards.map((rc) => (
                        <div
                          key={rc.id}
                          className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-4 px-4 py-3 bg-card hover:bg-muted/20 transition-colors"
                        >
                          {/* Site */}
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Site</p>
                            {rc.siteName ? (
                              <p className="text-sm text-foreground">{rc.siteName}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">All sites</p>
                            )}
                          </div>

                          {/* Mode */}
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Mode</p>
                            <ModePill mode={rc.mode} />
                          </div>

                          {/* Rate */}
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Rate</p>
                            <p className="text-sm font-medium text-foreground">
                              {formatINR(rc.rate)}
                              <span className="text-xs font-normal text-muted-foreground ml-1">/ {rateUnit}</span>
                            </p>
                          </div>

                          {/* Edit */}
                          {isAdmin && (
                            <EditRateDialog
                              partyId={partyId}
                              rateCardId={rc.id}
                              currentRate={rc.rate}
                              rateType={rc.rateType}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── Advances Tab ─────────────────────────────────────── */}
      <TabsContent value="advances">
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <PartyAdvanceDialog
                partyId={partyId}
                runningBalance={runningBalance}
                accounts={accounts}
              />
            </div>
          )}

          {advances.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No advances recorded"
              description="Advances received from this party will appear here."
              action={
                isAdmin ? (
                  <PartyAdvanceDialog
                    partyId={partyId}
                    runningBalance={runningBalance}
                    accounts={accounts}
                  />
                ) : undefined
              }
            />
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Account</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Notes</th>
                    {isAdmin && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {advances.map((a) => (
                    <tr key={a.id} className="bg-card hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(a.date)}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{formatINR(a.amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{a.accountName}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-xs truncate">{a.notes ?? '—'}</td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                              <Link href={`/dashboard/party-advances/${a.id}/edit`}>
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                <span className="sr-only">Edit</span>
                              </Link>
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border bg-muted/30">
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Total ({advances.length})</td>
                    <td className="px-4 py-2.5 font-bold text-foreground">{formatINR(advances.reduce((s, r) => s + r.amount, 0))}</td>
                    <td colSpan={isAdmin ? 3 : 2} className="hidden md:table-cell" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── Ledger Tab ────────────────────────────────────────── */}
      <TabsContent value="ledger">
        <EmptyState
          icon={BookOpen}
          title="Party Ledger"
          description="Full ledger with running balance coming in Phase 5."
        />
      </TabsContent>

      {/* ── Settlements Tab ───────────────────────────────────── */}
      <TabsContent value="settlements">
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <PartySettlementDialog
                partyId={partyId}
                runningBalance={runningBalance}
                accounts={accounts}
              />
            </div>
          )}

          {settlements.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No settlements recorded"
              description="Payments received from this party will appear here."
              action={
                isAdmin ? (
                  <PartySettlementDialog
                    partyId={partyId}
                    runningBalance={runningBalance}
                    accounts={accounts}
                  />
                ) : undefined
              }
            />
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Balance Before</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Received</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Writeoff</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Account</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {settlements.map((s) => (
                    <tr key={s.id} className="bg-card hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(s.date)}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatINR(s.balanceBefore)}</td>
                      <td className="px-4 py-3 font-semibold text-green-600 dark:text-green-400">{formatINR(s.amountReceived)}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.writeoffAmount > 0 ? formatINR(s.writeoffAmount) : '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{s.accountName}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell max-w-xs truncate">{s.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border bg-muted/30">
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Total ({settlements.length})</td>
                    <td className="hidden sm:table-cell" />
                    <td className="px-4 py-2.5 font-bold text-green-600 dark:text-green-400">{formatINR(settlements.reduce((s, r) => s + r.amountReceived, 0))}</td>
                    <td className="px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">{formatINR(settlements.reduce((s, r) => s + r.writeoffAmount, 0))}</td>
                    <td colSpan={2} className="hidden lg:table-cell" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </TabsContent>

      <ConfirmDialog
        open={confirmSiteOpen}
        onOpenChange={setConfirmSiteOpen}
        title={toggleTarget ? 'Activate Site?' : 'Deactivate Site?'}
        description={
          toggleTarget
            ? 'This site will become active and appear in job forms.'
            : 'This site will be marked inactive and hidden from job forms. Existing jobs are not affected.'
        }
        confirmLabel={toggleTarget ? 'Activate' : 'Deactivate'}
        variant={toggleTarget ? 'default' : 'destructive'}
        onConfirm={handleToggleSite}
        loading={loading}
      />
    </Tabs>
  )
}