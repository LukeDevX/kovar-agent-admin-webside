import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Toaster } from '@/components/ui/toaster'

import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Kovar Agent Admin', template: '%s · Kovar Admin' },
  description: 'Kovar Agent Admin Console',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
