'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { Button } from '@/components/ui/button'

import type { ListQuery } from '../schemas'

export function ListControls({
  resource,
  query,
  count,
}: {
  resource: 'agents' | 'whitelist'
  query: ListQuery
  count: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  function navigate(changes: Partial<ListQuery>) {
    const next = { ...query, ...changes }
    const params = new URLSearchParams({
      page: String(next.page),
      page_size: String(next.page_size),
    })
    if (next.status) params.set('status', next.status)
    startTransition(() => router.push(`/${resource}?${params}`))
  }
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-3"
      aria-busy={pending}
    >
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const params = new URLSearchParams({
            page: '1',
            page_size: String(data.get('page_size')),
          })
          const status = data.get('status')
          if (typeof status === 'string' && status) params.set('status', status)
          startTransition(() => router.push(`/${resource}?${params}`))
        }}
      >
        {resource === 'whitelist' && (
          <div>
            <label htmlFor="status" className="mb-1 block text-xs text-muted-foreground">
              Review status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={query.status ?? ''}
              className="h-9 rounded-md border px-3 text-sm"
              disabled={pending}
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="REVOKED">Revoked</option>
            </select>
          </div>
        )}
        <div>
          <label htmlFor="page_size" className="mb-1 block text-xs text-muted-foreground">
            Rows per page
          </label>
          <select
            id="page_size"
            name="page_size"
            defaultValue={query.page_size}
            className="h-9 rounded-md border px-3 text-sm"
            disabled={pending}
          >
            {[...new Set([10, 20, 50, 100, query.page_size])]
              .sort((a, b) => a - b)
              .map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
          </select>
        </div>
        <Button variant="outline" type="submit" disabled={pending}>
          Apply
        </Button>
      </form>
      <div className="flex items-center gap-3 text-sm">
        <span aria-live="polite" className="text-muted-foreground">
          Page {query.page} · {count} rows
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={pending || query.page === 1}
          onClick={() => navigate({ page: query.page - 1 })}
        >
          Previous page
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending || count < query.page_size || query.page >= 1000000}
          onClick={() => navigate({ page: query.page + 1 })}
        >
          Next page
        </Button>
      </div>
    </div>
  )
}
