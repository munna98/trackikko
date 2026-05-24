'use client'

import * as React from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { MachineForm } from '@/components/machines/machine-form'

type MachineType = {
  id: string
  name: string
  trackingUnit: 'hours' | 'trips' | 'km'
}

type MachineSheetProps = {
  machineTypes: MachineType[]
  defaultValues?: {
    id: string
    machineTypeId: string
    name: string
    identifier?: string
    capacity?: string
    currentMeterReading: number
  }
  trigger?: React.ReactNode
}

export function MachineSheet({ machineTypes, defaultValues, trigger }: MachineSheetProps) {
  const [open, setOpen] = React.useState(false)
  const isEdit = Boolean(defaultValues?.id)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="sm" id={isEdit ? `edit-machine-${defaultValues?.id}` : 'add-machine-btn'}>
            {isEdit ? (
              <>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Machine
              </>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Machine' : 'Add Machine'}</SheetTitle>
        </SheetHeader>
        <div className="px-6 py-6">
          <MachineForm
            machineTypes={machineTypes}
            defaultValues={defaultValues}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
