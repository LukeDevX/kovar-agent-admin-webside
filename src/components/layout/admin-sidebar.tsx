'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, ListChecks, Menu, ShieldCheck, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAVIGATION = [
  { href: '/', label: 'Dashboard', icon: House },
  { href: '/whitelist', label: 'Whitelist review', icon: ListChecks },
]

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <>
      <div className="flex h-20 items-center gap-3 px-6">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <p className="font-semibold tracking-wide">KOVAR</p>
          <p className="text-xs text-muted-foreground">Agent Admin</p>
        </div>
      </div>
      <p className="px-6 pb-3 pt-5 text-xs font-medium text-muted-foreground">Admin area</p>
      <nav aria-label="Main navigation" className="space-y-1 px-3">
        {NAVIGATION.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => onNavigate?.()}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring',
                active && 'bg-primary/10 text-primary',
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r bg-card md:block">
        <Navigation />
        <div className="absolute bottom-6 px-6 text-xs text-muted-foreground">
          Kovar Agent Gateway
          <br />
          <span className="mt-1 inline-block">Admin Console</span>
        </div>
      </aside>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
            <Menu />
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-72 bg-card shadow-xl">
            <Dialog.Title className="sr-only">Admin navigation</Dialog.Title>
            <Dialog.Description className="sr-only">Choose an admin module</Dialog.Description>
            <Navigation onNavigate={() => setOpen(false)} />
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                className="absolute right-2 top-2"
              >
                <X />
              </Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
