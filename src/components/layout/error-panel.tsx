import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { AppError } from '@/lib/api/errors'

import { RefreshButton } from './refresh-button'

export function ErrorPanel({ error }: { error: unknown }) {
  const known = error instanceof AppError
  return (
    <section role="alert" className="rounded-lg border border-destructive/30 bg-card p-6">
      <AlertCircle className="mb-3 size-5 text-destructive" />
      <h2 className="font-semibold">
        {known && error.status === 403 ? 'Access denied' : 'Unable to load'}
      </h2>
      <p className="my-3 text-sm text-muted-foreground">
        {known ? error.message : 'An unexpected error occurred. Refresh to retry.'}
      </p>
      {known && error.requestId && (
        <p className="mb-4 break-all font-mono text-xs text-muted-foreground">
          Request ID: {error.requestId}
        </p>
      )}
      <div className="flex gap-2">
        <RefreshButton />
        <Button variant="outline" asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </section>
  )
}
