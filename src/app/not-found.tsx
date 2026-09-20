import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">未找到页面或 Agent</h1>
      <p className="my-4 text-muted-foreground">请检查地址，或返回 Agent 列表。</p>
      <Button asChild>
        <Link href="/agents">返回列表</Link>
      </Button>
    </main>
  )
}
