import { z } from 'zod'

export const integerSchema = z
  .string()
  .regex(/^-?\d+$/)
  .refine(
    (value) =>
      /^-?\d+$/.test(value) &&
      BigInt(value) >= -9223372036854775808n &&
      BigInt(value) <= 9223372036854775807n,
    '超出 int64 范围',
  )
