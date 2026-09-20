import 'server-only'

import pino from 'pino'

export const logger = pino({
  level: 'info',
  base: { service: 'kovar-agent-admin', environment: process.env.NODE_ENV },
  redact: ['password', 'token', 'authorization', 'cookie'],
})
