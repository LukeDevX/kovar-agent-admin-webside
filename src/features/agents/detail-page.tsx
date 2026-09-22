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
        返回 Agent 列表
      </Link>
      <PageHeading
        title="Agent 详情"
        description="访问授权、账户绑定与预算策略。时间以北京时间显示。"
        action={<RefreshButton />}
      />
      <div className="mb-6 flex items-center gap-2 rounded-lg border bg-card px-4 py-3">
        <code className="min-w-0 break-all text-xs sm:text-sm">{agent.agent_id}</code>
        <CopyAddress address={agent.agent_id} />
      </div>
      <div className="space-y-5">
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Section title="基础信息">
            <Details
              fields={[
                { label: '运行状态', value: <StatusBadge status={agent.agent_status} /> },
                { label: '白名单状态', value: <StatusBadge status={agent.whitelist_status} /> },
                { label: '注册时间', value: formatDate(agent.created_at) },
                { label: '最后访问', value: formatDate(agent.last_seen_at) },
                { label: '审核人 ID', value: agent.reviewed_by ?? '—' },
                { label: '审核时间', value: formatDate(agent.reviewed_at) },
                {
                  label: '审核备注',
                  value: <span className="whitespace-pre-wrap">{agent.remark || '—'}</span>,
                },
              ]}
            />
          </Section>
          <Section title="账户与模型 API Key 绑定">
            <p className="mb-5 text-sm text-muted-foreground">
              同一 Kovar 用户可绑定多个 Agent，每个 Agent 使用独立的模型 API Key。此处仅展示 Key
              标识与状态，不展示密钥。
            </p>
            {agent.token_refresh_error && (
              <p role="status" className="mb-5 rounded-md border p-3 text-sm">
                Token 信息暂未刷新，以下可能是本地保存的数据。请稍后刷新重试。
              </p>
            )}
            {(agent.status === 'DELETE_PENDING' ||
              agent.token_binding_status === 'DELETE_PENDING') && (
              <p role="status" className="mb-5 rounded-md border p-3 text-sm">
                上游 Token 等待删除。可再次执行撤销授权以重试清理。
              </p>
            )}
            <Details
              fields={[
                { label: 'Kovar 用户 ID', value: agent.kovar_user_id ?? '未绑定' },
                {
                  label: 'Agent 模型 API Key ID',
                  value: agent.token_id ?? agent.kovar_token_id ?? '未绑定',
                },
                { label: '模型 Key 已绑定', value: agent.key_bound ? '是' : '否' },
                {
                  label: '本地模型 Key 状态',
                  value: <StatusBadge status={agent.status ?? agent.token_binding_status} />,
                },
                { label: '上游模型 Key 状态值', value: agent.kovar_token_status ?? '—' },
                { label: '模型 Key 过期时间', value: formatDate(agent.expired_at) },
                { label: '模型 Key 剩余额度', value: formatInteger(agent.remain_quota) },
              ]}
            />
          </Section>
        </div>
        <Section title="访问权限操作">
          <ReviewActions agent={agent} />
        </Section>
        <Section title="预算策略">
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
        <Section title="使用情况">
          <Details
            fields={[
              { label: '今日用量', value: formatInteger(agent.today_usage) },
              { label: '本月用量', value: formatInteger(agent.month_usage) },
              { label: '任务数', value: formatInteger(agent.task_count) },
              {
                label: '尚无实际成本的任务数',
                value: formatInteger(agent.tasks_without_actual_cost),
              },
            ]}
          />
          <p className="mt-5 text-xs text-muted-foreground">
            单位：Kovar quota
            units。实际成本已知时使用实际值，否则计入估算值；这些数据用于预算管理。
          </p>
        </Section>
      </div>
    </>
  )
}
