import type { AgentDetail } from '@/features/agents/schemas'

export const AGENT_ID = '0x1111111111111111111111111111111111111111'
export const agentFixture: AgentDetail = {
  agent_id: AGENT_ID,
  agent_status: 'REGISTERED',
  whitelist_status: 'PENDING',
  created_at: '2026-09-01T08:00:00Z',
  last_seen_at: null,
  reviewed_by: null,
  reviewed_at: null,
  remark: '',
  per_request_limit: '10000',
  daily_limit: '100000',
  monthly_limit: '1000000',
  kovar_user_id: null,
  kovar_token_id: null,
  key_bound: false,
  token_binding_status: null,
  kovar_token_status: null,
  expired_at: null,
  remain_quota: null,
  today_usage: '0',
  month_usage: '0',
  task_count: '0',
  tasks_without_actual_cost: '0',
}
