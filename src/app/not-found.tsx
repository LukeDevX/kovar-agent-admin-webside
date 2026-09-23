import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">Page or Agent not found</h1>
      <p className="my-4 text-muted-foreground">Check the address or return to the Agent list.</p>
      <Button asChild>
        <Link href="/agents">Back to list</Link>
      </Button>
    </main>
  )
}
