export type UserWithRole = {
  id: string
  email: string
  name: string
  roleId: string
  businessId: string | null
  isActive: boolean
  role: {
    id: string
    name: string
  }
  business: {
    id: string
    name: string
    phone: string | null
    address: string | null
  } | null
}

export type NavItem = {
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
}
