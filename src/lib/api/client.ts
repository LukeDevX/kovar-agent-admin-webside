import { parse } from 'lossless-json'
import { z } from 'zod'

import { AppError } from './errors'

const gatewayErrorSchema = z.object({ code: z.string(), request_id: z.string().optional() })
const requestIdSchema = z.string().regex(/^[A-Za-z0-9._:-]{1,128}$/)

type RequestOptions<T> = {
  baseUrl: string
  path: string
  schema: z.ZodType<T>
  token?: string
  method?: 'GET' | 'POST' | 'PUT'
  body?: string
  timeoutMs: number
  signal?: AbortSignal
}

export async function requestGateway<T>(options: RequestOptions<T>): Promise<T> {
  const requestId = crypto.randomUUID()
  const timeout = AbortSignal.timeout(options.timeoutMs)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  let response: Response
  try {
    response = await fetch(new URL(options.path, options.baseUrl), {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        'X-Request-Id': requestId,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      ...(options.body ? { body: options.body } : {}),
      signal,
      cache: 'no-store',
      redirect: 'error',
    })
  } catch (cause) {
    throw new AppError(
      timeout.aborted ? 'REQUEST_TIMEOUT' : signal.aborted ? 'REQUEST_CANCELLED' : 'NETWORK_ERROR',
      503,
      requestId,
      cause,
    )
  }
  const headerId = requestIdSchema.safeParse(response.headers.get('X-Request-Id'))
  let body: unknown
  try {
    // Gateway int64 must not pass through JavaScript floating point parsing.
    body = parse(await response.text(), undefined, (value) => value)
  } catch (cause) {
    throw new AppError(
      timeout.aborted
        ? 'REQUEST_TIMEOUT'
        : signal.aborted
          ? 'REQUEST_CANCELLED'
          : response.ok
            ? 'INVALID_RESPONSE'
            : 'HTTP_ERROR',
      response.ok ? 502 : response.status,
      headerId.success ? headerId.data : requestId,
      cause,
    )
  }
  if (!response.ok) {
    const error = gatewayErrorSchema.safeParse(body)
    const bodyId = requestIdSchema.safeParse(error.success ? error.data.request_id : undefined)
    throw new AppError(
      error.success ? error.data.code : 'HTTP_ERROR',
      response.status,
      bodyId.success ? bodyId.data : headerId.success ? headerId.data : requestId,
    )
  }
  const result = options.schema.safeParse(body)
  if (!result.success) {
    throw new AppError(
      'INVALID_RESPONSE',
      502,
      headerId.success ? headerId.data : requestId,
      result.error,
    )
  }
  return result.data
}
