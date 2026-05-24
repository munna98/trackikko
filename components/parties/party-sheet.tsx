'use client'

import * as React from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { PartyForm } from '@/components/parties/party-form'

type PartyDefaultValues = {
  id: string
  name: string
  mobile?: string
  address?: string
  gstNo?: string
  openingBalance: number
  runningBalance: number
}

type PartySheetProps = {
  defaultValues?: PartyDefaultValues
  trigger?: React.ReactNode
}

export function PartySheet({ defaultValues, trigger }: PartySheetProps) {
  const [open, setOpen] = React.useState(false)
  const isEdit = Boolean(defaultValues?.id)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="sm" id={isEdit ? `edit-party-${defaultValues?.id}` : 'add-party-btn'}>
            {isEdit ? (
              <><Pencil className="mr-2 h-4 w-4" />Edit</>
            ) : (
              <><Plus className="mr-2 h-4 w-4" />Add Party</>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Party' : 'Add Party'}</SheetTitle>
        </SheetHeader>
        <div className="px-6 py-6">
          <PartyForm
            defaultValues={defaultValues}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
