import { AgentDetailPage } from '@/features/agents/detail-page'

export const metadata = { title: 'Agent 详情' }

export default async function DetailPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params
  return <AgentDetailPage id={agentId} />
}
