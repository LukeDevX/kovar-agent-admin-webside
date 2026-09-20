import { AgentListPage } from '@/features/agents/list-page'

export const metadata = { title: '白名单审核' }

export default function WhitelistPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <AgentListPage resource="whitelist" searchParams={searchParams} />
}
