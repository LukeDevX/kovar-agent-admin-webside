import { describe, expect, it } from 'vitest'

import { AppError } from '@/lib/api/errors'

describe('Gateway migration error messages', () => {
  it.each([
    [400, 'The request is invalid. Check the input and try again.'],
    [401, 'Please sign in again.'],
    [403, 'Your account does not have permission to perform this action.'],
    [404, 'The resource was not found. Refresh and try again.'],
    [409, 'The state has changed. Refresh and confirm before retrying.'],
    [422, 'The input failed validation. Check the input and try again.'],
    [429, 'Too many requests. Please try again later.'],
    [500, 'The service is temporarily unavailable. Please try again later.'],
    [502, 'The service is temporarily unavailable. Please try again later.'],
    [503, 'The service is temporarily unavailable. Please try again later.'],
  ])('maps HTTP %s to an actionable safe message', (status, message) => {
    expect(new AppError('UNRECOGNIZED_CODE', status).message).toBe(message)
  })

  it.each([
    ['KOVAR_INVALID_REQUEST', 400, 'The request is invalid'],
    ['KOVAR_AUTH_FAILED', 401, 'The linked account authentication has expired'],
    ['KOVAR_FORBIDDEN', 403, 'The linked account cannot access this resource'],
    ['KOVAR_NOT_FOUND', 404, 'The resource was not found'],
    ['KOVAR_CONFLICT', 409, 'The state has changed'],
    ['UPSTREAM_RATE_LIMITED', 429, 'Too many requests'],
    ['KOVAR_REQUEST_REJECTED', 502, 'The upstream service rejected the operation'],
    ['KOVAR_CONTRACT_INCOMPLETE', 502, 'The service returned an unexpected response'],
    ['UPSTREAM_INVALID_RESPONSE', 502, 'The service returned an unexpected response'],
    ['UPSTREAM_ERROR', 502, 'The service is temporarily unavailable'],
  ])('handles %s without confusing upstream credentials with admin login', (code, status, text) => {
    expect(new AppError(code, status).message).toContain(text)
  })
})
