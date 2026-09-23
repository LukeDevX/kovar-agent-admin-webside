'use client'

import { Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

export function CopyAddress({ address }: { address: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Copy Agent address"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(address)
          toast.success('Address copied')
        } catch {
          toast.error('Copy failed. Select the address and copy it manually.')
        }
      }}
    >
      <Copy />
    </Button>
  )
}
