import { redirect } from 'next/navigation'

import { PageHeading } from '@/components/layout/page-heading'
import { RefreshButton } from '@/components/layout/refresh-button'
import { ErrorPanel } from '@/components/layout/error-panel'
import { AppError } from '@/lib/api/errors'

import { getAgents } from './api'
import { listQuerySchema } from './schemas'
import { AgentTable } from './components/agent-table'
import { ListControls } from './components/list-controls'

export async function AgentListPage({
  resource,
  searchParams,
}: {
  resource: 'agents' | 'whitelist'
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = listQuerySchema.safeParse({
    page: params.page,
    page_size: params.page_size,
    ...(resource === 'whitelist' && params.status ? { status: params.status } : {}),
  })
  const heading = (
    <PageHeading
      title={resource === 'agents' ? 'Agents' : 'Whitelist review'}
      description={
        resource === 'agents'
          ? 'View registered Agents, their runtime status, and usage.'
          : 'Review the queue and manage Agent access authorization.'
      }
      action={<RefreshButton />}
    />
  )
  if (!query.success)
    return (
      <>
        {heading}
        <ErrorPanel error={new AppError('INVALID_REQUEST', 400)} />
      </>
    )
  let result
  try {
    result = await getAgents(resource, query.data)
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect('/login')
    return (
      <>
        {heading}
        <ErrorPanel error={error} />
      </>
    )
  }
  return (
    <>
      {heading}
      <div className="space-y-4">
        <ListControls
          key={JSON.stringify(query.data)}
          resource={resource}
          query={query.data}
          count={result.items.length}
        />
        <AgentTable agents={result.items} />
        <p className="text-xs text-muted-foreground">
          Sorted by registration time in descending order. Usage is measured in Kovar quota units,
          aggregated by UTC day/month; unsettled tasks are included in estimates.
        </p>
      </div>
    </>
  )
}
