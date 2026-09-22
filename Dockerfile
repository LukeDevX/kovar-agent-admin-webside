FROM node:22-alpine AS base

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN corepack enable

FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
# next.config.ts validates this server-only URL while building. Compose replaces
# it at runtime with the same private Docker-network address.
ARG ALLOWED_ORIGINS
ENV GATEWAY_API_URL=http://gateway:8080 \
    ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
RUN pnpm build

FROM dependencies AS check
COPY . .
ARG ALLOWED_ORIGINS
ENV GATEWAY_API_URL=http://gateway:8080 \
    ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
RUN pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm knip

FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
