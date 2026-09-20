import { z } from 'zod'

import { integerSchema } from '@/lib/api/scalars'

const byteString = (max: number) =>
  z
    .string()
    .min(1, '此项必填')
    .refine((value) => new TextEncoder().encode(value).length <= max, `不能超过 ${max} UTF-8 字节`)

export const loginSchema = z.object({ username: byteString(128), password: byteString(72) })
export type LoginInput = z.infer<typeof loginSchema>
export const adminSchema = z.object({ id: integerSchema, username: z.string() })
export const loginResponseSchema = z.object({
  access_token: z.string().regex(/^[0-9a-f]{64}$/),
  token_type: z.literal('Bearer'),
  expires_in: z.coerce.number().int().positive().max(86400),
  admin: adminSchema,
})
