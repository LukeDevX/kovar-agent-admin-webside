import 'server-only'

import { gateway } from '@/lib/api/gateway'

import {
  addressSchema,
  agentDetailSchema,
  agentListSchema,
  listQuerySchema,
  type ListQuery,
} from './schemas'

export function getAgents(resource: 'agents' | 'whitelist', query: ListQuery) {
  const validated = listQuerySchema.parse(query)
  const params = new URLSearchParams({
    page: String(validated.page),
    page_size: String(validated.page_size),
  })
  if (resource === 'whitelist' && validated.status) params.set('status', validated.status)
  return gateway(`/${resource}?${params}`, agentListSchema)
}

export function getAgent(id: string) {
  return gateway(`/agents/${encodeURIComponent(addressSchema.parse(id))}`, agentDetailSchema)
}
