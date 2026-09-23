import { z } from 'zod'

import { integerSchema } from '@/lib/api/scalars'

const byteString = (max: number) =>
  z
    .string()
    .min(1, 'This field is required')
    .refine(
      (value) => new TextEncoder().encode(value).length <= max,
      `Must not exceed ${max} UTF-8 bytes`,
    )

export const loginSchema = z.object({ username: byteString(128), password: byteString(72) })
export const adminSchema = z.object({ id: integerSchema, username: z.string() })
export const loginResponseSchema = z.object({
  access_token: z.string().regex(/^[0-9a-f]{64}$/),
  token_type: z.literal('Bearer'),
  expires_in: z.coerce.number().int().positive().max(86400),
  admin: adminSchema,
})
