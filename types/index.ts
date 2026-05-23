import type { User, Business, UserRole } from '@prisma/client'

export type UserWithRole = User & {
  role: UserRole
  business: Business | null
}

export type NavItem = {
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
}
