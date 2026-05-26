'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type Machine = { id: string; name: string; trackingUnit: 'hours' | 'trips' | 'km'; hasModes: boolean }
type Site = { id: string; name: string }
type RateCardDialogProps = { partyId: string; machines: Machine[]; sites: Site[] }

export function RateCardDialog({ partyId, machines, sites }: RateCardDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<1 | 2 | 3>(1)
  const [selectedMachineId, setSelectedMachineId] = React.useState('')
  const [selectedSiteId, setSelectedSiteId] = React.useState('__all__')
  const [selectedMode, setSelectedMode] = React.useState<'bucket' | 'breaking' | null>(null)
  const [rate, setRate] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) {
      setStep(1)
      setSelectedMachineId('')
      setSelectedSiteId('__all__')
      setSelectedMode(null)
      setRate('')
      setError('')
    }
  }

  React.useEffect(() => {
    setSelectedMode(null)
  }, [selectedMachineId])

  const selectedMachine = machines.find(m => m.id === selectedMachineId)
  const rateUnit = selectedMachine?.trackingUnit === 'trips' ? 'trip' : 'hr'
  const selectedSiteName = sites.find(s => s.id === selectedSiteId)?.name ?? 'All sites'

  const STEP_PROGRESS: Record<number, number> = { 1: 33, 2: 66, 3: 100 }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    const res = await fetch(`/api/parties/${partyId}/rate-cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machineId: selectedMachineId,
        siteId: selectedSiteId === '__all__' ? null : selectedSiteId,
        mode: selectedMode,
        rateType: selectedMachine?.trackingUnit === 'trips' ? 'per_trip' : 'per_hour',
        rate: Number(rate),
      }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const data = await res.json() as { error?: string }
      setError(data.error ?? 'Something went wrong')
      return
    }
    router.refresh()
    handleOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button size="sm" id="add-rate-card-btn">
          <Plus className="mr-2 h-4 w-4" />Add Rate Card
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md flex flex-col gap-0">
        <SheetHeader className="border-b-0 pb-2">
          <SheetTitle>Add Rate Card</SheetTitle>
        </SheetHeader>
        
        <div className="px-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-foreground">
              {step === 1 && 'Pick a machine'}
              {step === 2 && 'Pick site & mode'}
              {step === 3 && 'Set the rate'}
            </p>
            <p className="text-xs text-muted-foreground">Step {step} of 3</p>
          </div>
          <Progress value={STEP_PROGRESS[step]} className="h-1.5" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {machines.map((m) => {
                  const isSelected = m.id === selectedMachineId
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMachineId(m.id)}
                      className={cn(
                        'rounded-xl border-2 p-3 cursor-pointer transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/40'
                      )}
                    >
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.trackingUnit}</p>
                    </div>
                  )
                })}
              </div>
              <Button
                className="w-full"
                disabled={!selectedMachineId}
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </>
          )}

          {step === 2 && selectedMachine && (
            <>
              <div className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">
                {selectedMachine.name}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Site</p>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setSelectedSiteId('__all__')}
                    className={cn(
                      'rounded-xl border-2 p-3 cursor-pointer transition-all',
                      selectedSiteId === '__all__'
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/40'
                    )}
                  >
                    <p className="text-sm font-medium text-foreground">All sites</p>
                    <p className="text-xs text-muted-foreground">Apply to every site</p>
                  </div>
                  {sites.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSiteId(s.id)}
                      className={cn(
                        'rounded-xl border-2 p-3 cursor-pointer transition-all',
                        selectedSiteId === s.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/40'
                      )}
                    >
                      <p className="text-sm font-medium text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">Site-specific rate</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedMachine.hasModes && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Mode</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['bucket', 'breaking'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedMode(m)}
                        className={cn(
                          'rounded-xl border-2 p-2.5 text-sm font-medium transition-all capitalize',
                          selectedMode === m
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-muted-foreground'
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={Boolean(selectedMachine.hasModes && !selectedMode)}
                  onClick={() => setStep(3)}
                >
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === 3 && selectedMachine && (
            <>
              <div className="rounded-lg bg-muted px-3 py-2.5 flex items-center gap-2 flex-wrap text-sm mb-4">
                <span>{selectedMachine.name}</span>
                <span className="text-muted-foreground">·</span>
                <span>{selectedSiteName}</span>
                {selectedMode && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="px-2 py-0.5 rounded-full text-xs capitalize bg-primary/10 text-primary font-medium">
                      {selectedMode}
                    </span>
                  </>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  Rate per {rateUnit} (₹)
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={rate}
                    onChange={e => setRate(e.target.value)}
                    className="w-full text-base font-medium pl-8 pr-3 py-2 border border-input rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 mb-4">
                  Charged per {rateUnit} worked
                </p>
                {error && <p className="text-sm text-destructive mb-3">{error}</p>}
              </div>

              <div className="flex gap-3 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={!rate || Number(rate) <= 0 || submitting}
                  onClick={handleSubmit}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save rate card
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
