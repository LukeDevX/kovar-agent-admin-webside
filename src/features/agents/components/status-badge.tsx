import { cn } from '@/lib/utils'

const LABELS: Record<string, string> = {
  REGISTERED: 'Registered',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  REVOKED: 'Revoked',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CREATING: 'Creating',
  DELETE_PENDING: 'Delete pending',
  DELETED: 'Deleted',
  UNKNOWN: 'Unknown',
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground">—</span>
  return (
    <span
      title={status}
      className={cn(
        'inline-flex whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium',
        ['ACTIVE', 'APPROVED'].includes(status)
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'bg-muted text-foreground',
      )}
    >
      {LABELS[status] ?? status}
      <span className="sr-only"> ({status})</span>
    </span>
  )
}
