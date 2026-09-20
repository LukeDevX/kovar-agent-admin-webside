import { AgentListPage } from '@/features/agents/list-page'

export const metadata = { title: 'Agents' }

export default function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <AgentListPage resource="agents" searchParams={searchParams} />
}
