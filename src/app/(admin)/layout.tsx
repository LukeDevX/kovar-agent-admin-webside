import { LogOut, ShieldCheck } from 'lucide-react'

import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { ErrorPanel } from '@/components/layout/error-panel'
import { Button } from '@/components/ui/button'
import { logout, requireAdmin } from '@/features/auth'
import { AppError } from '@/lib/api/errors'

import type { ReactNode } from 'react'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  let admin
  try {
    admin = await requireAdmin()
  } catch (error) {
    if (!(error instanceof AppError)) throw error
    return (
      <main className="mx-auto max-w-xl p-6">
        <ErrorPanel error={error} />
      </main>
    )
  }
  return (
    <div className="min-h-dvh md:pl-60">
      <a
        href="#main-content"
        className="sr-only z-50 rounded bg-card p-3 focus:not-sr-only focus:fixed"
      >
        Skip to main content
      </a>
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-8">
        <div className="flex items-center gap-3">
          <AdminSidebar />
          <span className="text-sm text-muted-foreground">Agent Admin Console</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-sm">
            <ShieldCheck className="size-4 text-primary" />
            <span className="max-w-32 truncate" title={admin.username}>
              {admin.username}
            </span>
          </span>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut />
              <span>Sign out</span>
            </Button>
          </form>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-screen-2xl p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}
