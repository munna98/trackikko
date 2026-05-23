'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { UserX, UserCheck } from 'lucide-react'

type Props = {
  staffId: string
  isActive: boolean
}

export function DeactivateButton({ staffId, isActive }: Props) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  async function handleToggle() {
    setLoading(true)
    await fetch(`/api/staff/${staffId}/deactivate`, { method: 'PATCH' })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        id={`${isActive ? 'deactivate' : 'reactivate'}-staff-btn`}
        className={isActive ? 'text-destructive hover:text-destructive' : ''}
      >
        {isActive ? (
          <>
            <UserX className="mr-2 h-4 w-4" />
            Deactivate
          </>
        ) : (
          <>
            <UserCheck className="mr-2 h-4 w-4" />
            Reactivate
          </>
        )}
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={isActive ? 'Deactivate Staff Member?' : 'Reactivate Staff Member?'}
        description={
          isActive
            ? 'This staff member will no longer be able to log in. Their records will be preserved.'
            : 'This will allow the staff member to log in again.'
        }
        confirmLabel={isActive ? 'Deactivate' : 'Reactivate'}
        variant={isActive ? 'destructive' : 'default'}
        onConfirm={handleToggle}
        loading={loading}
      />
    </>
  )
}
