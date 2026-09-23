import { LosslessNumber, stringify } from 'lossless-json'
import { z } from 'zod'

import { integerSchema } from '@/lib/api/scalars'

const INT64_MAX = 9223372036854775807n

const budgetValueSchema = z
  .string()
  .regex(/^\d+$/, 'Enter a non-negative integer')
  .refine(
    (value) => /^\d+$/.test(value) && BigInt(value) <= INT64_MAX,
    'Must not exceed 9223372036854775807',
  )
export const policySchema = z.object({
  per_request_limit: budgetValueSchema,
  daily_limit: budgetValueSchema,
  monthly_limit: budgetValueSchema,
})
export type Policy = z.infer<typeof policySchema>

export const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, 'Enter a valid EVM address')
  .transform((value) => value.toLowerCase())
const whitelistStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'])
const agentStatusSchema = z.enum(['REGISTERED', 'ACTIVE', 'SUSPENDED', 'REVOKED'])
const tokenStatusSchema = z.enum(['CREATING', 'ACTIVE', 'DELETE_PENDING', 'DELETED', 'UNKNOWN'])
const timestampSchema = z.iso.datetime({ offset: true })

const agentSchema = policySchema.extend({
  agent_id: addressSchema,
  agent_status: agentStatusSchema,
  whitelist_status: whitelistStatusSchema,
  created_at: timestampSchema,
  last_seen_at: timestampSchema.nullable(),
  reviewed_by: integerSchema.nullable(),
  reviewed_at: timestampSchema.nullable(),
  remark: z.string(),
})
const agentSummarySchema = agentSchema.extend({
  kovar_user_id: integerSchema.nullable(),
  kovar_token_id: integerSchema.nullable(),
  key_bound: z.boolean(),
  token_binding_status: tokenStatusSchema.nullable(),
  kovar_token_status: integerSchema.nullable(),
  expired_at: timestampSchema.nullable(),
  remain_quota: integerSchema.nullable(),
  today_usage: integerSchema,
  month_usage: integerSchema,
  task_count: integerSchema,
  tasks_without_actual_cost: integerSchema,
})
export const agentDetailSchema = agentSummarySchema.extend({
  token_id: integerSchema.nullable().optional(),
  status: tokenStatusSchema.optional(),
  // The UI only needs a failure flag; never serialize upstream error text into client props.
  token_refresh_error: z.string().transform(Boolean).optional(),
})
export type Agent = z.infer<typeof agentSchema>
export type AgentSummary = z.infer<typeof agentSummarySchema>
export type AgentDetail = z.infer<typeof agentDetailSchema>

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
})
export const listQuerySchema = paginationSchema.extend({ status: whitelistStatusSchema.optional() })
export type ListQuery = z.infer<typeof listQuerySchema>
export const agentListSchema = paginationSchema.extend({ items: z.array(agentSummarySchema) })
export const reviewActionSchema = z.enum(['approve', 'reject', 'suspend', 'resume', 'revoke'])
export type ReviewAction = z.infer<typeof reviewActionSchema>
export const reviewSchema = z.object({
  remark: z
    .string()
    .refine(
      (value) => new TextEncoder().encode(value).length <= 1000,
      'The remark must not exceed 1000 UTF-8 bytes',
    ),
})
export const reviewResponseSchema = agentSchema.extend({
  token_deletion_pending: z.boolean().optional(),
})

export function serializePolicy(policy: Policy): string {
  const validated = policySchema.parse(policy)
  const body = stringify({
    per_request_limit: new LosslessNumber(validated.per_request_limit.replace(/^0+(?=\d)/, '')),
    daily_limit: new LosslessNumber(validated.daily_limit.replace(/^0+(?=\d)/, '')),
    monthly_limit: new LosslessNumber(validated.monthly_limit.replace(/^0+(?=\d)/, '')),
  })
  if (!body) throw new Error('Cannot serialize policy')
  return body
}

export function availableActions(agent: Agent): ReviewAction[] {
  const actions: ReviewAction[] = []
  if (agent.agent_status === 'REGISTERED') {
    if (agent.whitelist_status === 'PENDING' || agent.whitelist_status === 'REJECTED')
      actions.push('approve')
    if (agent.whitelist_status === 'PENDING') actions.push('reject')
  }
  if (agent.agent_status === 'ACTIVE' && agent.whitelist_status === 'APPROVED')
    actions.push('suspend')
  if (agent.agent_status === 'SUSPENDED' && agent.whitelist_status === 'APPROVED')
    actions.push('resume')
  actions.push('revoke')
  return actions
}
