import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Trackikko',
    template: '%s | Trackikko',
  },
  description: 'Heavy equipment business management for excavator, tipper, and JCB rental businesses.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
