'use client'

import Link from 'next/link'

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main>
          <h1>Admin console is temporarily unavailable</h1>
          <p>Please retry or reopen the page.</p>
          <button onClick={reset}>Retry</button>
          <Link href="/">Back to home</Link>
        </main>
      </body>
    </html>
  )
}
