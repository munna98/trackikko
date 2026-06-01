'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { DataTable } from '@/components/ui/data-table'
import { StaffSheet } from '@/components/staff/staff-sheet'
import { Phone } from 'lucide-react'
import { formatINR, getInitials, cn } from '@/lib/utils'

type StaffMember = {
  id: string
  name: string
  email?: string | null
  mobile?: string
  designation?: string
  bloodGroup?: string
  roleId: string
  roleName: string
  isActive: boolean
  advanceBalance: number
  address?: string
  username?: string | null
}

type Props = {
  staff: StaffMember[]
  isAdmin: boolean
  currentUserId: string
}

const ROLE_LABEL: Record<string, string> = {
  master_admin: 'Master Admin',
  admin: 'Admin',
  accountant: 'Accountant',
  operator: 'Operator',
}

function StaffCard({ member, isAdmin, currentUserId }: { member: StaffMember; isAdmin: boolean; currentUserId: string }) {
  const router = useRouter()
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/dashboard/staff/${member.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/dashboard/staff/${member.id}`)}
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20 active:scale-[0.98] cursor-pointer',
        !member.isActive && 'opacity-60'
      )}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-primary/20 text-primary"
        aria-label={`Initials for ${member.name}`}
      >
        {getInitials(member.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-card-foreground truncate">{member.name}</p>
        {member.designation && (
          <p className="text-xs text-muted-foreground">{member.designation}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <Badge variant="secondary" className="text-xs">{ROLE_LABEL[member.roleId] ?? member.roleName}</Badge>
          {member.bloodGroup && member.bloodGroup !== 'Unknown' && (
            <Badge variant="outline" className="text-xs">{member.bloodGroup}</Badge>
          )}
          {!member.isActive && <StatusBadge status="inactive" />}
        </div>
        {member.mobile && (
          <a
            href={`tel:${member.mobile}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1.5 hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="h-3 w-3" />
            {member.mobile}
          </a>
        )}
        {member.advanceBalance > 0 && (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-1">
            Advance: {formatINR(member.advanceBalance)}
          </p>
        )}
      </div>
    </div>
  )
}

export function StaffListClient({ staff, isAdmin, currentUserId }: Props) {
  const [filterDesignation, setFilterDesignation] = React.useState<string>('all')

  const uniqueDesignations = React.useMemo(() => {
    const seen = new Set<string>()
    staff.forEach((s) => { if (s.designation) seen.add(s.designation) })
    return Array.from(seen).sort()
  }, [staff])

  const filtered =
    filterDesignation === 'all'
      ? staff
      : staff.filter((s) => s.designation === filterDesignation)

  const columns: ColumnDef<StaffMember>[] = [
    {
      id: 'member',
      header: 'Member',
      cell: ({ row }) => (
        <Link href={`/dashboard/staff/${row.original.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-primary/20 text-primary">
            {getInitials(row.original.name)}
          </div>
          <div>
            <p className="font-medium text-foreground">{row.original.name}</p>
            {row.original.designation && (
              <p className="text-xs text-muted-foreground">{row.original.designation}</p>
            )}
          </div>
        </Link>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant="secondary">{ROLE_LABEL[row.original.roleId] ?? row.original.roleName}</Badge>
      ),
    },
    {
      id: 'bloodGroup',
      header: 'Blood Group',
      cell: ({ row }) =>
        row.original.bloodGroup && row.original.bloodGroup !== 'Unknown' ? (
          <Badge variant="outline">{row.original.bloodGroup}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      id: 'mobile',
      header: 'Mobile',
      cell: ({ row }) =>
        row.original.mobile ? (
          <a href={`tel:${row.original.mobile}`} className="text-sm hover:text-primary transition-colors">
            {row.original.mobile}
          </a>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      id: 'advance',
      header: 'Advance',
      cell: ({ row }) =>
        row.original.advanceBalance > 0 ? (
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
            {formatINR(row.original.advanceBalance)}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'active' : 'inactive'} />,
    },
    ...(isAdmin
      ? [
          {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: StaffMember } }) => (
              <StaffSheet
                defaultValues={{
                  id: row.original.id,
                  name: row.original.name,
                  email: row.original.email,
                  roleId: row.original.roleId as 'admin' | 'accountant' | 'operator',
                  mobile: row.original.mobile,
                  address: row.original.address,
                  bloodGroup: row.original.bloodGroup,
                  designation: row.original.designation,
                  username: row.original.username,
                }}
                currentUserId={currentUserId}
              />
            ),
          } satisfies ColumnDef<StaffMember>,
        ]
      : []),
  ]

  return (
    <div className="space-y-4">
      {/* Designation filter — client-side */}
      {uniqueDesignations.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterDesignation('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              filterDesignation === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50'
            )}
          >
            All
          </button>
          {uniqueDesignations.map((d) => (
            <button
              key={d}
              onClick={() => setFilterDesignation(d)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                filterDesignation === d
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      {/* Mobile: card list */}
      <div className="space-y-2 md:hidden">
        {filtered.map((member) => (
          <StaffCard
            key={member.id}
            member={member}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
          />
        ))}
      </div>

      {/* Desktop: data table */}
      <div className="hidden md:block">
        <DataTable columns={columns} data={filtered} />
      </div>
    </div>
  )
}
