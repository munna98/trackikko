import { type SessionOptions } from 'iron-session'

export type SessionData = {
  userId: string
  roleId: string
  businessId: string | null
  mustChangePassword: boolean
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'trackikko_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax',
  },
}
