import { NextResponse } from 'next/server'

const ADMIN_ROLES = ['master_admin', 'admin']

/**
 * Returns a 403 NextResponse if the user is not an admin.
 * Use at the top of every write (POST/PATCH/DELETE) API route:
 *
 *   const forbidden = requireAdmin(user)
 *   if (forbidden) return forbidden
 */
export function requireAdmin(user: { roleId: string }): NextResponse | null {
  if (!ADMIN_ROLES.includes(user.roleId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}
