'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, ClockCheck, CircleCheckBig } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { JobEditSheet } from '@/components/jobs/job-edit-sheet'
import { cn } from '@/lib/utils'

type JobActionsProps = {
  jobId: string
  isReviewed: boolean
  defaultValues: {
    actualRate: number
    batha: number
    bathaPaidBy: 'party' | 'company'
    date: string
  }
}

export function JobActions({ jobId, isReviewed, defaultValues }: JobActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [togglingReview, setTogglingReview] = React.useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) {
      setDeleteOpen(false)
      router.push('/dashboard/jobs')
      router.refresh()
    }
  }

  async function handleToggleReview() {
    setTogglingReview(true)
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isReviewed: !isReviewed }),
    })
    setTogglingReview(false)
    if (res.ok) {
      router.refresh()
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          id="job-toggle-review-btn"
          variant="outline"
          size="sm"
          onClick={handleToggleReview}
          disabled={togglingReview}
          className={cn(
            "transition-all",
            isReviewed 
              ? "border-emerald-250 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800" 
              : "border-amber-250 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
          )}
        >
          {isReviewed ? (
            <>
              <CircleCheckBig className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Reviewed
            </>
          ) : (
            <>
              <ClockCheck className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
              Mark Reviewed
            </>
          )}
        </Button>
        <Button
          id="job-edit-btn"
          variant="outline"
          size="sm"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          Edit
        </Button>
        <Button
          id="job-delete-btn"
          variant="destructive"
          size="sm"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Delete
        </Button>
      </div>

      <JobEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        jobId={jobId}
        defaultValues={defaultValues}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Job"
        description="This will soft-delete the job. Party balance will be updated automatically. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
