import { cn } from '@/lib/utils'

const LABELS: Record<string, string> = {
  REGISTERED: '已注册',
  ACTIVE: '活跃',
  SUSPENDED: '已暂停',
  REVOKED: '已撤销',
  PENDING: '待审核',
  APPROVED: '已批准',
  REJECTED: '已拒绝',
  CREATING: '创建中',
  DELETE_PENDING: '待删除',
  DELETED: '已删除',
  UNKNOWN: '未知',
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
