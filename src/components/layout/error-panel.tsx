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
        {known && error.status === 403 ? '无权访问' : '暂时无法加载'}
      </h2>
      <p className="my-3 text-sm text-muted-foreground">
        {known ? error.message : '出现意外错误，请刷新重试。'}
      </p>
      {known && error.requestId && (
        <p className="mb-4 break-all font-mono text-xs text-muted-foreground">
          请求编号：{error.requestId}
        </p>
      )}
      <div className="flex gap-2">
        <RefreshButton />
        <Button variant="outline" asChild>
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    </section>
  )
}
