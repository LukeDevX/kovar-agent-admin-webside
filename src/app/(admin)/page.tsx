import Link from 'next/link'
import { ArrowUpRight, Bot, ListChecks } from 'lucide-react'

import { PageHeading } from '@/components/layout/page-heading'

export default function HomePage() {
  return (
    <>
      <PageHeading title="工作台" description="管理 Agent 访问权限、审核白名单与调整使用预算。" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          {
            href: '/agents',
            title: 'Agents',
            description: '查看注册信息、账户绑定、用量与预算。',
            icon: Bot,
          },
          {
            href: '/whitelist',
            title: '白名单审核',
            description: '按审核状态查看 Agent，处理访问授权。',
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
