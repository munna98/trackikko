import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export default async function RootPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (!user.businessId && user.roleId !== 'master_admin') {
    redirect('/setup')
  }

  if (user.roleId === 'master_admin') {
    redirect('/master')
  }

  if (user.roleId === 'operator') {
    redirect('/operator/my-records')
  }

  redirect('/dashboard')
}
