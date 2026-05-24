import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/page-header'
import { ExpenseCategoryDialog } from '@/components/settings/expense-category-dialog'
import { ExpenseCategoriesClient } from '@/components/settings/expense-categories-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Expense Categories' }

export default async function ExpenseCategoriesPage() {
  const user = await getCurrentUser()
  if (!user?.businessId) redirect('/login')

  const businessId = user.businessId!
  const isAdmin = user.roleId === 'admin' || user.roleId === 'master_admin'

  const categories = await prisma.expenseCategory.findMany({
    where: {
      deletedAt: null,
      OR: [{ businessId: null }, { businessId }],
    },
    orderBy: [{ businessId: 'asc' }, { name: 'asc' }],
  })

  type CatRow = (typeof categories)[number]
  const serialised = categories.map((c: CatRow) => ({
    id: c.id,
    name: c.name,
    appliesTo: c.appliesTo as 'machine' | 'staff' | 'other' | null,
    isActive: c.isActive,
    isGlobal: c.businessId === null,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Categories"
        description="Manage expense categories for logging costs."
        action={isAdmin ? <ExpenseCategoryDialog /> : undefined}
      />
      <ExpenseCategoriesClient categories={serialised} isAdmin={isAdmin} />
    </div>
  )
}
