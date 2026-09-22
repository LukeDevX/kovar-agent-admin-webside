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
  }, 'GATEWAY_API_URL 必须是无凭据、路径或查询参数的 HTTP(S) 服务地址'),
  GATEWAY_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300000).default(135000),
  // 可选。逗号分隔的 host[:port] 来源，允许其调用 Server Actions。
  // 当应用通过 IP 或反向代理访问、且代理改写了 Host/Origin 头时需要。
  ALLOWED_ORIGINS: z.string().optional(),
})

export function getServerEnv() {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(
      'Gateway 环境配置缺失或无效。请按照 .env.example 配置 GATEWAY_API_URL 和 GATEWAY_TIMEOUT_MS。',
    )
  }
  return parsed.data
}
