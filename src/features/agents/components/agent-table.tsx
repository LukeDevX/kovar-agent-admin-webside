import Link from 'next/link'
import { Bot, ChevronRight } from 'lucide-react'

import { formatDate, formatInteger } from '../format'
import { StatusBadge } from './status-badge'

import type { AgentSummary } from '../schemas'

export function AgentTable({ agents }: { agents: AgentSummary[] }) {
  if (agents.length === 0)
    return (
      <div className="rounded-lg border bg-card px-6 py-16 text-center">
        <Bot className="mx-auto mb-4 size-8 text-muted-foreground" />
        <h2 className="font-medium">暂无 Agent</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          当前页没有记录，可调整筛选条件或返回上一页。
        </p>
      </div>
    )
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full whitespace-nowrap text-left text-sm">
        <caption className="sr-only">Agent 列表，时间以北京时间显示</caption>
        <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
          <tr>
            {[
              'Agent 地址',
              '运行状态',
              '白名单',
              'Kovar 用户',
              '今日 / 本月用量',
              '注册时间 (北京时间)',
              '操作',
            ].map((title) => (
              <th scope="col" key={title} className="px-4 py-3 font-medium">
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {agents.map((agent) => (
            <tr key={agent.agent_id} className="hover:bg-muted/40">
              <td className="px-4 py-4">
                <Link
                  href={`/agents/${agent.agent_id}`}
                  title={agent.agent_id}
                  className="block max-w-52 truncate font-mono text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  {agent.agent_id}
                </Link>
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={agent.agent_status} />
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={agent.whitelist_status} />
              </td>
              <td className="px-4 py-4 font-mono text-xs">{agent.kovar_user_id ?? '未绑定'}</td>
              <td className="px-4 py-4 font-mono text-xs tabular-nums">
                {formatInteger(agent.today_usage)}
                <span className="px-2 text-muted-foreground">/</span>
                {formatInteger(agent.month_usage)}
              </td>
              <td className="px-4 py-4 text-xs text-muted-foreground">
                {formatDate(agent.created_at)}
              </td>
              <td className="px-4 py-4">
                <Link
                  href={`/agents/${agent.agent_id}`}
                  aria-label={`查看 ${agent.agent_id} 详情`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                >
                  详情
                  <ChevronRight className="size-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
