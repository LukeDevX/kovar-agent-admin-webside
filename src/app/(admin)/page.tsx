import Link from 'next/link'
import { ArrowUpRight, Bot, ListChecks } from 'lucide-react'

import { PageHeading } from '@/components/layout/page-heading'

export default function HomePage() {
  return (
    <>
      <PageHeading
        title="Dashboard"
        description="Manage Agent access, review the whitelist, and adjust usage budgets."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          {
            href: '/agents',
            title: 'Agents',
            description: 'View registration details, account bindings, usage, and budgets.',
            icon: Bot,
          },
          {
            href: '/whitelist',
            title: 'Whitelist review',
            description: 'Review Agents by status and manage access authorization.',
            icon: ListChecks,
          },
        ].map(({ href, title, description, icon: Icon }) => (
          <Link
            href={href}
            key={href}
            className="group rounded-lg border bg-card p-6 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            <div className="mb-6 flex justify-between">
              <Icon className="size-6 text-primary" />
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </Link>
        ))}
      </div>
    </>
  )
}
