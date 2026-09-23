import { beforeEach, describe, expect, it, vi } from 'vitest'

import { reviewAgent, updateBudget } from '@/features/agents/actions'
import { gateway } from '@/lib/api/gateway'
import { AppError } from '@/lib/api/errors'
import { revalidatePath } from 'next/cache'

import { AGENT_ID, agentFixture } from './fixtures'

vi.mock('@/lib/api/gateway', () => ({ gateway: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`)
  },
}))
beforeEach(() => vi.clearAllMocks())

describe('server mutation boundaries', () => {
  it('rejects invalid actions, paths and budgets on the server', async () => {
    expect((await reviewAgent(AGENT_ID, 'delete', { remark: '' })).ok).toBe(false)
    expect((await reviewAgent('../login', 'revoke', { remark: '' })).ok).toBe(false)
    expect((await updateBudget(AGENT_ID, { daily_limit: '-1' })).ok).toBe(false)
    expect(gateway).not.toHaveBeenCalled()
  })
  it('uses exact PUT contract and invalidates only affected routes', async () => {
    vi.mocked(gateway).mockResolvedValue(agentFixture)
    await expect(
      updateBudget(AGENT_ID, {
        per_request_limit: '1',
        daily_limit: '9223372036854775807',
        monthly_limit: '0',
      }),
    ).resolves.toEqual({ ok: true })
    expect(gateway).toHaveBeenCalledWith(`/agents/${AGENT_ID}/budget`, expect.anything(), {
      method: 'PUT',
      body: '{"per_request_limit":1,"daily_limit":9223372036854775807,"monthly_limit":0}',
    })
    expect(vi.mocked(revalidatePath).mock.calls).toEqual([
      [`/agents/${AGENT_ID}`],
      ['/agents'],
      ['/whitelist'],
    ])
  })
  it('preserves revoke partial-success information', async () => {
    vi.mocked(gateway).mockResolvedValue({ ...agentFixture, token_deletion_pending: true })
    expect(await reviewAgent(AGENT_ID, 'revoke', { remark: 'review' })).toMatchObject({
      ok: true,
      warning: expect.stringContaining('deletion is still pending'),
    })
  })
  it('redirects expired sessions and does not invalidate on failed writes', async () => {
    vi.mocked(gateway).mockRejectedValue(new AppError('INVALID_ADMIN_TOKEN', 401))
    await expect(reviewAgent(AGENT_ID, 'approve', { remark: '' })).rejects.toThrow(
      'redirect:/login',
    )
    expect(revalidatePath).not.toHaveBeenCalled()
  })
  it('returns safe failure details without false success', async () => {
    vi.mocked(gateway).mockRejectedValue(new AppError('INVALID_AGENT_STATE', 409, 'trace-1'))
    expect(await reviewAgent(AGENT_ID, 'approve', { remark: '' })).toEqual({
      ok: false,
      message: 'The Agent state has changed. Refresh and try again.',
      requestId: 'trace-1',
    })
  })
})
