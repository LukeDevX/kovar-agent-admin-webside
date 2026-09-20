import { describe, expect, it } from 'vitest'

import {
  availableActions,
  policySchema,
  reviewSchema,
  serializePolicy,
  listQuerySchema,
  agentDetailSchema,
} from '@/features/agents/schemas'
import { loginSchema } from '@/features/auth/schemas'

import { agentFixture } from './fixtures'

describe('Gateway request contracts', () => {
  it('round-trips full int64 budgets as JSON numbers without precision loss', () => {
    const policy = {
      per_request_limit: '9223372036854775807',
      daily_limit: '0',
      monthly_limit: '9007199254740993',
    }
    expect(serializePolicy(policy)).toBe(
      '{"per_request_limit":9223372036854775807,"daily_limit":0,"monthly_limit":9007199254740993}',
    )
  })
  it.each(['-1', '1.5', '1e3', '', 'abc', '9223372036854775808'])(
    'rejects invalid budget %s',
    (value) => {
      expect(
        policySchema.safeParse({ per_request_limit: value, daily_limit: '0', monthly_limit: '0' })
          .success,
      ).toBe(false)
    },
  )
  it('allows independent limits and normalizes leading zeros', () => {
    expect(
      serializePolicy({ per_request_limit: '001', daily_limit: '0', monthly_limit: '0' }),
    ).toContain(':1,')
  })
  it('enforces UTF-8 byte lengths for remarks and credentials', () => {
    expect(reviewSchema.safeParse({ remark: '中'.repeat(333) }).success).toBe(true)
    expect(reviewSchema.safeParse({ remark: '中'.repeat(334) }).success).toBe(false)
    expect(loginSchema.safeParse({ username: 'admin', password: '中'.repeat(25) }).success).toBe(
      false,
    )
  })
  it('follows exact pagination and filter bounds', () => {
    expect(listQuerySchema.parse({})).toEqual({ page: 1, page_size: 20 })
    expect(listQuerySchema.safeParse({ page: '1000001' }).success).toBe(false)
    expect(listQuerySchema.safeParse({ page_size: '101' }).success).toBe(false)
    expect(listQuerySchema.safeParse({ status: 'SUSPENDED' }).success).toBe(false)
  })
  it('strips unexpected secrets from responses', () => {
    expect(
      agentDetailSchema.parse({ ...agentFixture, access_token: 'secret', private_key: 'secret' }),
    ).not.toHaveProperty('access_token')
  })
})

describe('Gateway status transitions', () => {
  it('allows approve and reject only when pending', () =>
    expect(availableActions(agentFixture)).toEqual(['approve', 'reject', 'revoke']))
  it('allows rejected applications to be approved', () =>
    expect(availableActions({ ...agentFixture, whitelist_status: 'REJECTED' })).toEqual([
      'approve',
      'revoke',
    ]))
  it('allows active agents to be suspended', () =>
    expect(
      availableActions({ ...agentFixture, agent_status: 'ACTIVE', whitelist_status: 'APPROVED' }),
    ).toEqual(['suspend', 'revoke']))
  it('allows suspended agents to resume', () =>
    expect(
      availableActions({
        ...agentFixture,
        agent_status: 'SUSPENDED',
        whitelist_status: 'APPROVED',
      }),
    ).toEqual(['resume', 'revoke']))
  it('only allows cleanup retries on revoked agents', () =>
    expect(
      availableActions({ ...agentFixture, agent_status: 'REVOKED', whitelist_status: 'REVOKED' }),
    ).toEqual(['revoke']))
})
