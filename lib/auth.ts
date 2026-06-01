'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions, type SessionData } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session.userId) return null

  return prisma.user.findUnique({
    where: { id: session.userId, deletedAt: null },
    include: { role: true, business: true },
  })
}

export async function signOut() {
  const session = await getSession()
  session.destroy()
  redirect('/login')
}
