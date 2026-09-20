'use client'

import Link from 'next/link'

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="zh-CN">
      <body>
        <main>
          <h1>管理后台暂时不可用</h1>
          <p>请重试或重新打开页面。</p>
          <button onClick={reset}>重试</button>
          <Link href="/">返回首页</Link>
        </main>
      </body>
    </html>
  )
}
