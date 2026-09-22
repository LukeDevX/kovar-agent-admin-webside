import type { NextConfig } from 'next'

import { getServerEnv } from './src/config/env.server'

const env = getServerEnv()

// Optional comma-separated host[:port] list. Required when the app is reached via
// an IP address or a reverse proxy that rewrites the Host/Origin headers, so the
// Server Actions CSRF check can still match the real origin.
const allowedOrigins = (env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) =>
    origin
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, ''),
  )
  .filter(Boolean)

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  allowedDevOrigins: allowedOrigins.map((origin) => origin.replace(/:\d+$/, '')),
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
        ],
      },
    ]
  },
}

export default nextConfig
