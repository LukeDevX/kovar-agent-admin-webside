'use client'

import { Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

export function CopyAddress({ address }: { address: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="复制 Agent 地址"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(address)
          toast.success('地址已复制')
        } catch {
          toast.error('复制失败，请手动选择地址复制。')
        }
      }}
    >
      <Copy />
    </Button>
  )
}
