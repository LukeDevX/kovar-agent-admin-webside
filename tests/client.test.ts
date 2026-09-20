import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { requestGateway } from '@/lib/api/client'
import { AppError } from '@/lib/api/errors'

const baseOptions = {
  baseUrl: 'http://gateway.test',
  path: '/api/v1/admin/me',
  schema: z.object({ id: z.string() }),
  timeoutMs: 1000,
}
afterEach(() => vi.unstubAllGlobals())

describe('HTTP boundary', () => {
  it('preserves large integers and attaches authentication with no cache', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"id":9223372036854775807}'))
    vi.stubGlobal('fetch', fetcher)
    expect(await requestGateway({ ...baseOptions, token: 'test-token' })).toEqual({
      id: '9223372036854775807',
    })
    expect(fetcher).toHaveBeenCalledWith(
      new URL('http://gateway.test/api/v1/admin/me'),
      expect.objectContaining({
        cache: 'no-store',
        redirect: 'error',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    )
  })
  it.each([400, 401, 403, 404, 409, 422, 429, 500, 502, 503])(
    'handles HTTP %s without displaying internal messages or retrying',
    async (status) => {
      const fetcher = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'UPSTREAM_INTERNAL',
            message: 'secret database password',
            request_id: 'trace-123',
          }),
          { status },
        ),
      )
      vi.stubGlobal('fetch', fetcher)
      const error = await requestGateway(baseOptions).catch((cause: unknown) => cause)
      expect(error).toBeInstanceOf(AppError)
      expect(error).toMatchObject({ status, requestId: 'trace-123' })
      expect(String(error)).not.toContain('secret')
      expect(fetcher).toHaveBeenCalledTimes(1)
    },
  )
  it.each(['not-json', '{"unexpected":true}'])(
    'rejects invalid successful response %s',
    async (body) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)))
      await expect(requestGateway(baseOptions)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
    },
  )
  it('preserves 401 even when upstream error is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>unauthorized</html>', { status: 401 })),
    )
    await expect(requestGateway(baseOptions)).rejects.toMatchObject({ status: 401 })
  })
  it('maps network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    await expect(requestGateway(baseOptions)).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })
  it('maps cancellation separately', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')))
    await expect(
      requestGateway({ ...baseOptions, signal: AbortSignal.abort() }),
    ).rejects.toMatchObject({ code: 'REQUEST_CANCELLED' })
  })
  it('times out a stalled request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: URL, options: RequestInit) =>
          new Promise((_resolve, reject) =>
            options.signal?.addEventListener('abort', () =>
              reject(new DOMException('timeout', 'TimeoutError')),
            ),
          ),
      ),
    )
    await expect(requestGateway({ ...baseOptions, timeoutMs: 5 })).rejects.toMatchObject({
      code: 'REQUEST_TIMEOUT',
    })
  })
})
