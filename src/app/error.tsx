'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg p-8" role="alert">
      <h1 className="text-xl font-semibold">The page is temporarily unavailable</h1>
      <p className="my-4 text-muted-foreground">Please retry or return home to continue.</p>
      <div className="flex gap-3">
        <Button onClick={reset}>Retry</Button>
        <Button variant="outline" asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  )
}
