'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { JobEditSheet } from '@/components/jobs/job-edit-sheet'

type JobActionsProps = {
  jobId: string
  defaultValues: {
    actualRate: number
    batha: number
    date: string
  }
}

export function JobActions({ jobId, defaultValues }: JobActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

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

  return (
    <>
      <div className="flex items-center gap-2">
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
