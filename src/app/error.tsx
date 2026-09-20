'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg p-8" role="alert">
      <h1 className="text-xl font-semibold">页面暂时不可用</h1>
      <p className="my-4 text-muted-foreground">请重试，或返回首页继续操作。</p>
      <div className="flex gap-3">
        <Button onClick={reset}>重试</Button>
        <Button variant="outline" asChild>
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    </main>
  )
}
