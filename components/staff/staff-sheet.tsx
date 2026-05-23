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
import { StaffForm } from '@/components/staff/staff-form'

type StaffDefaultValues = {
  id: string
  name: string
  email: string
  roleId: 'admin' | 'accountant' | 'operator'
  mobile?: string
  address?: string
  bloodGroup?: string
  designation?: string
  defaultBatha: number
  salary: number
}

type StaffSheetProps = {
  defaultValues?: StaffDefaultValues
  currentUserId?: string
  trigger?: React.ReactNode
}

export function StaffSheet({ defaultValues, currentUserId, trigger }: StaffSheetProps) {
  const [open, setOpen] = React.useState(false)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const isEdit = Boolean(defaultValues?.id)

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSuccessMessage(null) }}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="sm" id={isEdit ? `edit-staff-${defaultValues?.id}` : 'add-staff-btn'}>
            {isEdit ? (
              <>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Staff Member
              </>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEdit ? 'Edit Staff Member' : 'Add Staff Member'}</SheetTitle>
        </SheetHeader>
        {successMessage ? (
          <div className="rounded-xl border border-border bg-muted/50 p-5 text-center space-y-3">
            <p className="text-sm font-medium text-foreground">{successMessage}</p>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <StaffForm
            defaultValues={defaultValues}
            currentUserId={currentUserId}
            onSuccess={(msg) => {
              if (msg) {
                setSuccessMessage(msg)
              } else {
                setOpen(false)
              }
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
