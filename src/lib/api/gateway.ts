import 'server-only'

import { cookies } from 'next/headers'

import { getServerEnv } from '@/config/env.server'

import { requestGateway } from './client'
import { AppError } from './errors'

import type { z } from 'zod'

export const SESSION_COOKIE = 'kovar_admin_session'

export async function gateway<T>(
  path: string,
  schema: z.ZodType<T>,
  options: { method?: 'GET' | 'POST' | 'PUT'; body?: string; public?: boolean } = {},
): Promise<T> {
  const env = getServerEnv()
  const token = options.public ? undefined : (await cookies()).get(SESSION_COOKIE)?.value
  if (!options.public && !token) throw new AppError('INVALID_ADMIN_TOKEN', 401)
  return requestGateway({
    baseUrl: env.GATEWAY_API_URL,
    path: `/api/v1/admin${path}`,
    schema,
    timeoutMs: env.GATEWAY_TIMEOUT_MS,
    ...(token ? { token } : {}),
    ...(options.method ? { method: options.method } : {}),
    ...(options.body ? { body: options.body } : {}),
  })
}
