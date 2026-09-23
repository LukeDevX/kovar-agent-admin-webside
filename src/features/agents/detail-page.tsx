import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { PageHeading } from '@/components/layout/page-heading'
import { RefreshButton } from '@/components/layout/refresh-button'
import { ErrorPanel } from '@/components/layout/error-panel'
import { AppError } from '@/lib/api/errors'

import { addressSchema } from './schemas'
import { getAgent } from './api'
import { formatDate, formatInteger } from './format'
import { BudgetForm } from './components/budget-form'
import { ReviewActions } from './components/review-dialog'
import { StatusBadge } from './components/status-badge'
import { CopyAddress } from './components/copy-address'

import type { ReactNode } from 'react'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card">
      <h2 className="border-b px-5 py-4 text-sm font-semibold">{title}</h2>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Details({ fields }: { fields: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      {fields.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="mb-1.5 text-xs text-muted-foreground">{label}</dt>
          <dd className="break-words text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export async function AgentDetailPage({ id }: { id: string }) {
  const address = addressSchema.safeParse(id)
  if (!address.success) notFound()
  let agent
  try {
    agent = await getAgent(address.data)
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect('/login')
    if (error instanceof AppError && error.status === 404) notFound()
    return <ErrorPanel error={error} />
  }
  return (
    <>
      <Link
        href="/agents"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Agent list
      </Link>
      <PageHeading
        title="Agent details"
        description="Access authorization, account bindings, and budget policy. Times are shown in Beijing time."
        action={<RefreshButton />}
      />
      <div className="mb-6 flex items-center gap-2 rounded-lg border bg-card px-4 py-3">
        <code className="min-w-0 break-all text-xs sm:text-sm">{agent.agent_id}</code>
        <CopyAddress address={agent.agent_id} />
      </div>
      <div className="space-y-5">
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Section title="Basic information">
            <Details
              fields={[
                { label: 'Runtime status', value: <StatusBadge status={agent.agent_status} /> },
                {
                  label: 'Whitelist status',
                  value: <StatusBadge status={agent.whitelist_status} />,
                },
                { label: 'Registered at', value: formatDate(agent.created_at) },
                { label: 'Last seen', value: formatDate(agent.last_seen_at) },
                { label: 'Reviewed by ID', value: agent.reviewed_by ?? '—' },
                { label: 'Reviewed at', value: formatDate(agent.reviewed_at) },
                {
                  label: 'Review remark',
                  value: <span className="whitespace-pre-wrap">{agent.remark || '—'}</span>,
                },
              ]}
            />
          </Section>
          <Section title="Account & model API key bindings">
            <p className="mb-5 text-sm text-muted-foreground">
              One Kovar user can bind multiple Agents, and each Agent uses a separate model API key.
              Only key identifiers and status are shown here; the secret itself is never displayed.
            </p>
            {agent.token_refresh_error && (
              <p role="status" className="mb-5 rounded-md border p-3 text-sm">
                Token information has not been refreshed yet; the data below may be from local
                storage. Refresh again shortly.
              </p>
            )}
            {(agent.status === 'DELETE_PENDING' ||
              agent.token_binding_status === 'DELETE_PENDING') && (
              <p role="status" className="mb-5 rounded-md border p-3 text-sm">
                Upstream token deletion is pending. Run Revoke access again to retry cleanup.
              </p>
            )}
            <Details
              fields={[
                { label: 'Kovar user ID', value: agent.kovar_user_id ?? 'Not bound' },
                {
                  label: 'Agent model API key ID',
                  value: agent.token_id ?? agent.kovar_token_id ?? 'Not bound',
                },
                { label: 'Model key bound', value: agent.key_bound ? 'Yes' : 'No' },
                {
                  label: 'Local model key status',
                  value: <StatusBadge status={agent.status ?? agent.token_binding_status} />,
                },
                {
                  label: 'Upstream model key status value',
                  value: agent.kovar_token_status ?? '—',
                },
                { label: 'Model key expiry', value: formatDate(agent.expired_at) },
                { label: 'Model key remaining quota', value: formatInteger(agent.remain_quota) },
              ]}
            />
          </Section>
        </div>
        <Section title="Access actions">
          <ReviewActions agent={agent} />
        </Section>
        <Section title="Budget policy">
          <BudgetForm
            key={`${agent.agent_id}:${agent.per_request_limit}:${agent.daily_limit}:${agent.monthly_limit}`}
            agentId={agent.agent_id}
            policy={{
              per_request_limit: agent.per_request_limit,
              daily_limit: agent.daily_limit,
              monthly_limit: agent.monthly_limit,
            }}
          />
        </Section>
        <Section title="Usage">
          <Details
            fields={[
              { label: 'Today usage', value: formatInteger(agent.today_usage) },
              { label: 'This month usage', value: formatInteger(agent.month_usage) },
              { label: 'Task count', value: formatInteger(agent.task_count) },
              {
                label: 'Tasks without actual cost',
                value: formatInteger(agent.tasks_without_actual_cost),
              },
            ]}
          />
          <p className="mt-5 text-xs text-muted-foreground">
            Unit: Kovar quota units. Actual cost is used when known; otherwise estimates are
            included. This data is used for budget management.
          </p>
        </Section>
      </div>
    </>
  )
}
