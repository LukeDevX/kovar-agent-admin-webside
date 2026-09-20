import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div role="status" aria-label="正在加载页面" className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-80 w-full" />
      <span className="sr-only">正在加载页面</span>
    </div>
  )
}
