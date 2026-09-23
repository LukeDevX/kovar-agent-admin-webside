import { beforeEach, describe, expect, it, vi } from 'vitest'

import { login, logout, submitLogin } from '@/features/auth/actions'
import { gateway } from '@/lib/api/gateway'
import { AppError } from '@/lib/api/errors'

const cookieJar = vi.hoisted(() => ({ set: vi.fn(), delete: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: async () => cookieJar }))
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`)
  },
}))
vi.mock('@/lib/api/gateway', () => ({ gateway: vi.fn(), SESSION_COOKIE: 'kovar_admin_session' }))
beforeEach(() => vi.clearAllMocks())

describe('Gateway login session', () => {
  it('keeps the bearer token in an HttpOnly same-site cookie and excludes it from the return value', async () => {
    vi.mocked(gateway).mockResolvedValue({
      access_token: 'a'.repeat(64),
      expires_in: 3600,
      token_type: 'Bearer',
      admin: { id: '1', username: 'admin' },
    })
    expect(await login({ username: 'admin', password: 'password' })).toEqual({ ok: true })
    expect(cookieJar.set).toHaveBeenCalledWith(
      'kovar_admin_session',
      'a'.repeat(64),
      expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/', maxAge: 3600 }),
    )
  })
  it('does not establish a session when upstream authentication fails', async () => {
    vi.mocked(gateway).mockRejectedValue(new AppError('INVALID_ADMIN_CREDENTIALS', 401))
    expect(await login({ username: 'admin', password: 'wrong' })).toMatchObject({ ok: false })
    expect(cookieJar.set).not.toHaveBeenCalled()
  })
  it('validates credentials on the server', async () => {
    expect(await login({ username: '', password: '' })).toMatchObject({ ok: false })
    expect(gateway).not.toHaveBeenCalled()
  })
  it('keeps a forbidden login out of the session without exposing raw errors', async () => {
    vi.mocked(gateway).mockRejectedValue(new AppError('FORBIDDEN', 403))
    expect(await login({ username: 'admin', password: 'password' })).toEqual({
      ok: false,
      message: 'Your account does not have permission to perform this action.',
    })
    expect(cookieJar.set).not.toHaveBeenCalled()
  })
  it('reads credentials from a POST form action instead of URL search parameters', async () => {
    vi.mocked(gateway).mockResolvedValue({
      access_token: 'a'.repeat(64),
      expires_in: 3600,
      token_type: 'Bearer',
      admin: { id: '1', username: 'admin' },
    })
    const formData = new FormData()
    formData.set('username', 'admin')
    formData.set('password', 'password')
    await expect(submitLogin(null, formData)).rejects.toThrow('redirect:/')
    expect(gateway).toHaveBeenCalledWith('/login', expect.anything(), {
      method: 'POST',
      body: '{"username":"admin","password":"password"}',
      public: true,
    })
  })
  it('logs out locally without inventing a Gateway logout endpoint', async () => {
    await expect(logout()).rejects.toThrow('redirect:/login')
    expect(cookieJar.delete).toHaveBeenCalledWith('kovar_admin_session')
    expect(gateway).not.toHaveBeenCalled()
  })
})
