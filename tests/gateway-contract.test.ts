import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAgent, getAgents } from '@/features/agents/api'
import { reviewResponseSchema } from '@/features/agents/schemas'
import { adminSchema } from '@/features/auth/schemas'
import { requireAdmin } from '@/features/auth/session'
import { gateway } from '@/lib/api/gateway'

import { AGENT_ID, agentFixture } from './fixtures'

const cookieJar = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: async () => cookieJar }))
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`)
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('GATEWAY_API_URL', 'http://gateway.test')
  cookieJar.get.mockReturnValue({ value: 'admin-session' })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function respond(body: unknown, status = 200) {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

describe('current Gateway Admin contract through the real client', () => {
  it('only forwards the admin bearer and documented list filters', async () => {
    const fetcher = respond({ items: [agentFixture], page: 2, page_size: 10 })
    await getAgents('whitelist', { page: 2, page_size: 10, status: 'PENDING' })
    const [url, options] = fetcher.mock.calls[0] ?? []
    expect(String(url)).toBe(
      'http://gateway.test/api/v1/admin/whitelist?page=2&page_size=10&status=PENDING',
    )
    expect(options.headers).toEqual({
      Accept: 'application/json',
      'X-Request-Id': expect.any(String),
      Authorization: 'Bearer admin-session',
    })
    expect(cookieJar.get).toHaveBeenCalledWith('kovar_admin_session')
  })

  it('keeps admin pagination without inventing total or forwarding unsupported filters', async () => {
    const fetcher = respond({ items: [], page: 3, page_size: 20 })
    expect(await getAgents('agents', { page: 3, page_size: 20, status: 'PENDING' })).toEqual({
      items: [],
      page: 3,
      page_size: 20,
    })
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      'http://gateway.test/api/v1/admin/agents?page=3&page_size=20',
    )
  })

  it('normalizes EVM identity and preserves user/model key separation and exact quota', async () => {
    const address = `0x${'ab'.repeat(20)}`
    const fetcher = respond({
      ...agentFixture,
      agent_id: address.toUpperCase().replace('0X', '0x'),
      kovar_user_id: '7',
      kovar_token_id: '11',
      token_id: '11',
      key_bound: true,
      status: 'ACTIVE',
      remain_quota: '9223372036854775807',
      api_key: 'raw-model-key',
      access_token: 'management-token',
      private_key: 'wallet-secret',
      token: { key: 'nested-secret' },
    })
    const agent = await getAgent(address.toUpperCase().replace('0X', '0x'))
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      `http://gateway.test/api/v1/admin/agents/${address}`,
    )
    expect(agent).toMatchObject({
      agent_id: address,
      kovar_user_id: '7',
      token_id: '11',
      agent_status: 'REGISTERED',
      status: 'ACTIVE',
      remain_quota: '9223372036854775807',
    })
    expect(JSON.stringify(agent)).not.toMatch(
      /raw-model-key|management-token|wallet-secret|nested-secret/,
    )
  })

  it.each([
    'KOVAR_AUTH_FAILED',
    'KOVAR_FORBIDDEN',
    'UPSTREAM_RATE_LIMITED',
    'secret raw upstream body',
  ])('reduces partial refresh failure %s to a flag before client serialization', async (code) => {
    respond({ ...agentFixture, token_refresh_error: code })
    const agent = await getAgent(AGENT_ID)
    expect(agent.token_refresh_error).toBe(true)
    expect(JSON.stringify(agent)).not.toContain(code)
  })

  it('keeps revoke partial success but drops unneeded raw error details', async () => {
    respond({
      ...agentFixture,
      token_deletion_pending: true,
      token_deletion_error: 'secret raw body',
    })
    const result = await gateway(`/agents/${AGENT_ID}/revoke`, reviewResponseSchema, {
      method: 'POST',
      body: '{"remark":"review"}',
    })
    expect(result.token_deletion_pending).toBe(true)
    expect(JSON.stringify(result)).not.toContain('secret raw body')
  })

  it.each([403, 404, 409, 429, 500, 502, 503])(
    'propagates detail HTTP %s safely',
    async (status) => {
      respond({ code: 'UNKNOWN', message: 'secret upstream credentials' }, status)
      await expect(getAgent(AGENT_ID)).rejects.toMatchObject({ status })
    },
  )

  it('does not treat Gateway business rejection as a successful response', async () => {
    respond({ code: 'KOVAR_REQUEST_REJECTED', message: 'secret raw upstream' }, 502)
    await expect(getAgent(AGENT_ID)).rejects.toMatchObject({
      status: 502,
      code: 'KOVAR_REQUEST_REJECTED',
    })
  })

  it('rejects an upstream envelope instead of assuming it is an Admin DTO', async () => {
    respond({ success: false, message: 'secret', data: agentFixture })
    await expect(getAgent(AGENT_ID)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })

  it('does not send unauthenticated reads or writes', async () => {
    cookieJar.get.mockReturnValue(undefined)
    const fetcher = respond({})
    await expect(gateway('/me', adminSchema)).rejects.toMatchObject({ status: 401 })
    await expect(
      gateway(`/agents/${AGENT_ID}/revoke`, reviewResponseSchema, {
        method: 'POST',
        body: '{}',
      }),
    ).rejects.toMatchObject({ status: 401 })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('redirects an expired admin token and preserves permission failures', async () => {
    respond({ code: 'INVALID_ADMIN_TOKEN' }, 401)
    await expect(requireAdmin()).rejects.toThrow('redirect:/login')
    respond({ code: 'FORBIDDEN' }, 403)
    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 })
  })
})
