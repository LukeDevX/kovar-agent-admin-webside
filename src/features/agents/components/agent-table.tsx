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
        <h2 className="font-medium">No Agents</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page has no records. Adjust the filters or go back a page.
        </p>
      </div>
    )
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full whitespace-nowrap text-left text-sm">
        <caption className="sr-only">Agent list; times are shown in Beijing time</caption>
        <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
          <tr>
            {[
              'Agent address',
              'Runtime status',
              'Whitelist',
              'Kovar user',
              'Today / month usage',
              'Registered at (Beijing time)',
              'Actions',
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
              <td className="px-4 py-4 font-mono text-xs">{agent.kovar_user_id ?? 'Not bound'}</td>
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
                  aria-label={`View ${agent.agent_id} details`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                >
                  Details
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
