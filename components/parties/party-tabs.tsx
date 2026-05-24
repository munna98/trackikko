'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Tag, BookOpen, CheckCircle, Pencil } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SiteDialog } from '@/components/parties/site-dialog'
import { RateCardDialog } from '@/components/parties/rate-card-dialog'
import { formatINR, formatDate } from '@/lib/utils'

type Site = {
  id: string
  name: string
  location?: string
  isActive: boolean
}

type RateCard = {
  id: string
  machineName: string
  siteName: string | null
  mode: string | null
  rateType: string
  rate: number
  effectiveFrom: string
  isActive: boolean
}

type Machine = {
  id: string
  name: string
  trackingUnit: 'hours' | 'trips' | 'km'
  hasModes: boolean
}

type PartyTabsProps = {
  partyId: string
  sites: Site[]
  rateCards: RateCard[]
  machines: Machine[]
  isAdmin: boolean
}

export function PartyTabs({ partyId, sites, rateCards, machines, isAdmin }: PartyTabsProps) {
  const router = useRouter()
  const [deactivatingSiteId, setDeactivatingSiteId] = React.useState<string | null>(null)
  const [deactivatingRateCardId, setDeactivatingRateCardId] = React.useState<string | null>(null)
  const [confirmSiteOpen, setConfirmSiteOpen] = React.useState(false)
  const [confirmRcOpen, setConfirmRcOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  async function handleDeactivateSite() {
    if (!deactivatingSiteId) return
    setLoading(true)
    await fetch(`/api/parties/${partyId}/sites/${deactivatingSiteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })
    setLoading(false)
    setConfirmSiteOpen(false)
    setDeactivatingSiteId(null)
    router.refresh()
  }

  async function handleDeactivateRateCard() {
    if (!deactivatingRateCardId) return
    setLoading(true)
    await fetch(`/api/parties/${partyId}/rate-cards/${deactivatingRateCardId}`, { method: 'PATCH' })
    setLoading(false)
    setConfirmRcOpen(false)
    setDeactivatingRateCardId(null)
    router.refresh()
  }

  return (
    <Tabs defaultValue="sites" className="flex-col">
      <TabsList className="w-full h-auto flex-wrap justify-start gap-0.5 p-1">
        <TabsTrigger value="sites">Sites</TabsTrigger>
        <TabsTrigger value="rate-cards">Rate Cards</TabsTrigger>
        <TabsTrigger value="ledger">Ledger</TabsTrigger>
        <TabsTrigger value="settlements">Settlements</TabsTrigger>
      </TabsList>

      {/* ── Sites Tab ─────────────────────────────────────── */}
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
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Location</th>
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
                            {site.isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive text-xs"
                                onClick={() => { setDeactivatingSiteId(site.id); setConfirmSiteOpen(true) }}
                              >
                                Deactivate
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

      {/* ── Rate Cards Tab ────────────────────────────────── */}
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
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Machine</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Site</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Mode</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rate</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">From</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    {isAdmin && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rateCards.map((rc) => (
                    <tr key={rc.id} className="bg-card hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{rc.machineName}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {rc.siteName ?? <span className="text-xs italic">All sites</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell capitalize">
                        {rc.mode ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {formatINR(rc.rate)}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          / {rc.rateType === 'per_hour' ? 'hr' : 'trip'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {formatDate(rc.effectiveFrom)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={rc.isActive ? 'secondary' : 'outline'} className={!rc.isActive ? 'text-muted-foreground' : ''}>
                          {rc.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          {rc.isActive && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive text-xs"
                              onClick={() => { setDeactivatingRateCardId(rc.id); setConfirmRcOpen(true) }}
                            >
                              Deactivate
                            </Button>
                          )}
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

      {/* ── Ledger Tab ────────────────────────────────────── */}
      <TabsContent value="ledger">
        <EmptyState
          icon={BookOpen}
          title="Party Ledger"
          description="Full ledger with running balance coming in Phase 5."
        />
      </TabsContent>

      {/* ── Settlements Tab ───────────────────────────────── */}
      <TabsContent value="settlements">
        <EmptyState
          icon={CheckCircle}
          title="Settlements"
          description="Settlement recording coming in Phase 5."
        />
      </TabsContent>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmSiteOpen}
        onOpenChange={setConfirmSiteOpen}
        title="Deactivate Site?"
        description="This site will be marked inactive. Existing jobs linked to it are not affected."
        confirmLabel="Deactivate"
        variant="destructive"
        onConfirm={handleDeactivateSite}
        loading={loading}
      />
      <ConfirmDialog
        open={confirmRcOpen}
        onOpenChange={setConfirmRcOpen}
        title="Deactivate Rate Card?"
        description="This rate card will no longer be used for new jobs."
        confirmLabel="Deactivate"
        variant="destructive"
        onConfirm={handleDeactivateRateCard}
        loading={loading}
      />
    </Tabs>
  )
}
