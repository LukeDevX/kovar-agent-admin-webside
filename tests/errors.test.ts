import { describe, expect, it } from 'vitest'

import { AppError } from '@/lib/api/errors'

describe('Gateway migration error messages', () => {
  it.each([
    [400, '输入不符合接口要求，请检查后重试。'],
    [401, '请重新登录。'],
    [403, '当前账号没有操作权限。'],
    [404, '资源不存在，请刷新后重试。'],
    [409, '状态已变化，请刷新确认后重试。'],
    [422, '输入未通过业务校验，请检查后重试。'],
    [429, '请求过于频繁，请稍后重试。'],
    [500, '服务暂时不可用，请稍后重试。'],
    [502, '服务暂时不可用，请稍后重试。'],
    [503, '服务暂时不可用，请稍后重试。'],
  ])('maps HTTP %s to an actionable safe message', (status, message) => {
    expect(new AppError('UNRECOGNIZED_CODE', status).message).toBe(message)
  })

  it.each([
    ['KOVAR_INVALID_REQUEST', 400, '输入不符合接口要求'],
    ['KOVAR_AUTH_FAILED', 401, '绑定账户的认证已失效'],
    ['KOVAR_FORBIDDEN', 403, '绑定账户无权访问该资源'],
    ['KOVAR_NOT_FOUND', 404, '资源不存在'],
    ['KOVAR_CONFLICT', 409, '状态已变化'],
    ['UPSTREAM_RATE_LIMITED', 429, '请求过于频繁'],
    ['KOVAR_REQUEST_REJECTED', 502, '上游服务未接受该操作'],
    ['KOVAR_CONTRACT_INCOMPLETE', 502, '服务返回的数据格式异常'],
    ['UPSTREAM_INVALID_RESPONSE', 502, '服务返回的数据格式异常'],
    ['UPSTREAM_ERROR', 502, '服务暂时不可用'],
  ])('handles %s without confusing upstream credentials with admin login', (code, status, text) => {
    expect(new AppError(code, status).message).toContain(text)
  })
})
