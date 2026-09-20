// Isolated contract fixture for Playwright only; never imported by the application.
import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { parse, stringify, LosslessNumber } from 'lossless-json'

const id = '0x1111111111111111111111111111111111111111'
const initialAgent = {
  agent_id: id,
  agent_status: 'REGISTERED',
  whitelist_status: 'PENDING',
  created_at: '2026-09-01T08:00:00Z',
  last_seen_at: null,
  reviewed_by: null,
  reviewed_at: null,
  remark: '',
  per_request_limit: new LosslessNumber('10000'),
  daily_limit: new LosslessNumber('100000'),
  monthly_limit: new LosslessNumber('1000000'),
  kovar_user_id: null,
  kovar_token_id: null,
  key_bound: false,
  token_binding_status: null,
  kovar_token_status: null,
  expired_at: null,
  remain_quota: null,
  today_usage: 0,
  month_usage: 0,
  task_count: 0,
  tasks_without_actual_cost: 0,
}
type FixtureAgent = typeof initialAgent
const sessions = new Map<string, { username: string; agent: FixtureAgent }>()
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1:18080')
  function send(value: unknown, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'X-Request-Id': 'fixture-request' })
    res.end(stringify(value))
  }
  let raw = ''
  for await (const chunk of req) raw += String(chunk)
  const body: unknown = raw ? parse(raw) : {}
  const input = body && typeof body === 'object' ? body : {}
  if (url.pathname === '/health') return send({ status: 'ok' })
  if (url.pathname === '/api/v1/admin/login') {
    if (
      !('username' in input) ||
      typeof input.username !== 'string' ||
      !('password' in input) ||
      input.password !== 'test-password'
    )
      return send({ code: 'INVALID_ADMIN_CREDENTIALS' }, 401)
    const token = randomBytes(32).toString('hex')
    sessions.set(token, { username: input.username, agent: { ...initialAgent } })
    return send({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
      admin: { id: 1, username: input.username },
    })
  }
  const session = sessions.get(req.headers.authorization?.replace('Bearer ', '') ?? '')
  if (!session) return send({ code: 'INVALID_ADMIN_TOKEN' }, 401)
  if (url.pathname === '/api/v1/admin/me') return send({ id: 1, username: session.username })
  if (session.username === 'forbidden')
    return send({ code: 'FORBIDDEN', message: 'sensitive internal URL' }, 403)
  if (session.username === 'expired') return send({ code: 'INVALID_ADMIN_TOKEN' }, 401)
  if (session.username === 'failure')
    return send({ code: 'INTERNAL_ERROR', message: 'secret database details' }, 500)
  if (session.username === 'rate-limited')
    return send({ code: 'UPSTREAM_RATE_LIMITED', message: 'sensitive internal details' }, 429)
  if (session.username === 'business-failure')
    return send({ code: 'KOVAR_REQUEST_REJECTED', message: 'sensitive internal details' }, 502)
  if (session.username === 'slow') await new Promise((resolve) => setTimeout(resolve, 1500))
  if (url.pathname === '/api/v1/admin/agents' || url.pathname === '/api/v1/admin/whitelist') {
    const status = url.searchParams.get('status')
    const page = Number(url.searchParams.get('page') ?? 1)
    return send({
      items:
        session.username === 'empty' ||
        page > 1 ||
        (status && status !== session.agent.whitelist_status)
          ? []
          : [session.agent],
      page,
      page_size: Number(url.searchParams.get('page_size') ?? 20),
    })
  }
  if (url.pathname === `/api/v1/admin/agents/${id}`) {
    if (session.username === 'bound' || session.username === 'stale-binding') {
      return send({
        ...session.agent,
        kovar_user_id: 7,
        kovar_token_id: 11,
        key_bound: true,
        token_binding_status: 'ACTIVE',
        kovar_token_status: 1,
        remain_quota: new LosslessNumber('9007199254740993'),
        ...(session.username === 'stale-binding'
          ? { token_refresh_error: 'KOVAR_AUTH_FAILED sensitive-fixture-secret' }
          : { token_id: 11, status: 'ACTIVE' }),
        api_key: 'sensitive-fixture-secret',
        access_token: 'sensitive-fixture-secret',
        private_key: 'sensitive-fixture-secret',
      })
    }
    return send(session.agent)
  }
  if (url.pathname === `/api/v1/admin/agents/${id}/budget` && req.method === 'PUT') {
    if (
      'per_request_limit' in input &&
      input.per_request_limit instanceof LosslessNumber &&
      'daily_limit' in input &&
      input.daily_limit instanceof LosslessNumber &&
      'monthly_limit' in input &&
      input.monthly_limit instanceof LosslessNumber
    ) {
      session.agent = {
        ...session.agent,
        per_request_limit: input.per_request_limit,
        daily_limit: input.daily_limit,
        monthly_limit: input.monthly_limit,
      }
      return send(input)
    }
    return send({ code: 'INVALID_REQUEST' }, 400)
  }
  const action = url.pathname.split('/').at(-1)
  if (req.method === 'POST' && url.pathname.startsWith(`/api/v1/admin/agents/${id}/`)) {
    if (action === 'approve')
      session.agent = { ...session.agent, agent_status: 'ACTIVE', whitelist_status: 'APPROVED' }
    else if (action === 'reject') session.agent = { ...session.agent, whitelist_status: 'REJECTED' }
    else if (action === 'suspend') session.agent = { ...session.agent, agent_status: 'SUSPENDED' }
    else if (action === 'resume') session.agent = { ...session.agent, agent_status: 'ACTIVE' }
    else if (action === 'revoke')
      session.agent = { ...session.agent, agent_status: 'REVOKED', whitelist_status: 'REVOKED' }
    else return send({ code: 'NOT_FOUND' }, 404)
    if ('remark' in input && typeof input.remark === 'string') session.agent.remark = input.remark
    return send({
      ...session.agent,
      ...(action === 'revoke'
        ? { token_deletion_pending: true, token_deletion_error: 'UPSTREAM_ERROR' }
        : {}),
    })
  }
  send({ code: 'AGENT_NOT_FOUND' }, 404)
})
server.listen(18080, '127.0.0.1')
