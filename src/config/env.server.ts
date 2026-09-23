import { z } from 'zod'

const envSchema = z.object({
  GATEWAY_API_URL: z.url().refine((value) => {
    const url = new URL(value)
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === '/'
    )
  }, 'GATEWAY_API_URL must be an HTTP(S) service URL without credentials, path, or query parameters'),
  GATEWAY_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300000).default(135000),
  // Optional. Comma-separated host[:port] origins allowed to call Server Actions.
  // Needed when the app is accessed through an IP or reverse proxy that rewrites Host/Origin headers.
  ALLOWED_ORIGINS: z.string().optional(),
})

export function getServerEnv() {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(
      'Gateway environment configuration is missing or invalid. Configure GATEWAY_API_URL and GATEWAY_TIMEOUT_MS as described in .env.example.',
    )
  }
  return parsed.data
}
