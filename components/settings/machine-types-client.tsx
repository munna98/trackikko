'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Cog } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { MachineTypeDialog } from '@/components/settings/machine-type-dialog'
import { cn } from '@/lib/utils'

type MachineType = {
  id: string
  name: string
  trackingUnit: 'hours' | 'trips' | 'km'
  hasModes: boolean
  isBillable: boolean
  isActive: boolean
  isGlobal: boolean
}

type Props = { machineTypes: MachineType[]; isAdmin: boolean }

const UNIT_BADGE: Record<string, string> = {
  hours: 'bg-primary/15 text-primary',
  trips: 'bg-chart-2/15 text-chart-2',
  km: 'bg-muted text-muted-foreground',
}

const UNIT_LABEL: Record<string, string> = {
  hours: 'Hours',
  trips: 'Trips',
  km: 'KM',
}

function MachineTypeRow({ machineType, isAdmin }: { machineType: MachineType; isAdmin: boolean }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function handleToggle() {
    setPending(true)
    await fetch(`/api/settings/machine-types/${machineType.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !machineType.isActive }),
    })
    setPending(false)
    router.refresh()
  }

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl border border-border',
      machineType.isGlobal ? 'bg-muted/50' : 'bg-card'
    )}>
      {machineType.isGlobal && <Lock className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />}
      <p className={cn('flex-1 text-sm font-medium', machineType.isGlobal && 'text-muted-foreground')}>
        {machineType.name}
      </p>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', UNIT_BADGE[machineType.trackingUnit])}>
          {UNIT_LABEL[machineType.trackingUnit]}
        </span>
        {machineType.hasModes && (
          <Badge variant="outline" className="text-xs">Has Modes</Badge>
        )}
        {!machineType.isBillable && (
          <Badge variant="outline" className="text-xs text-muted-foreground">Non-Billable</Badge>
        )}
        {!machineType.isGlobal && isAdmin && (
          <>
            <Switch
              checked={machineType.isActive}
              onCheckedChange={handleToggle}
              disabled={pending}
              id={`toggle-machine-type-${machineType.id}`}
            />
            <MachineTypeDialog defaultValues={machineType} />
          </>
        )}
      </div>
    </div>
  )
}

export function MachineTypesClient({ machineTypes, isAdmin }: Props) {
  const globals = machineTypes.filter((t) => t.isGlobal)
  const custom = machineTypes.filter((t) => !t.isGlobal)

  if (machineTypes.length === 0) {
    return (
      <EmptyState
        icon={Cog}
        title="No machine types"
        description="Add a machine type to start adding machines."
        action={isAdmin ? <MachineTypeDialog /> : undefined}
      />
    )
  }

  return (
    <div className="space-y-6">
      {globals.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Default Types</h3>
          <div className="space-y-1.5">
            {globals.map((t) => <MachineTypeRow key={t.id} machineType={t} isAdmin={isAdmin} />)}
          </div>
        </div>
      )}
      {globals.length > 0 && custom.length > 0 && <Separator />}
      {custom.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Custom Types</h3>
          <div className="space-y-1.5">
            {custom.map((t) => <MachineTypeRow key={t.id} machineType={t} isAdmin={isAdmin} />)}
          </div>
        </div>
      )}
    </div>
  )
}
