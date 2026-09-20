const MESSAGES: Record<string, string> = {
  INVALID_ADMIN_CREDENTIALS: '用户名或密码不正确。',
  INVALID_ADMIN_TOKEN: '登录已失效，请重新登录。',
  AGENT_NOT_FOUND: '未找到该 Agent。',
  INVALID_AGENT_ADDRESS: 'Agent 地址格式不正确。',
  INVALID_AGENT_STATE: 'Agent 状态已变化，请刷新后重试。',
  INVALID_REQUEST: '输入不符合接口要求，请检查后重试。',
  RATE_LIMITED: '请求过于频繁，请稍后重试。',
  REQUEST_TIMEOUT: '请求超时，请刷新确认当前状态。',
  REQUEST_CANCELLED: '请求已取消。',
  NETWORK_ERROR: '暂时无法连接服务，请稍后重试。',
  INVALID_RESPONSE: '服务返回的数据格式异常，请联系管理员。',
  KOVAR_AUTH_FAILED: '绑定账户的认证已失效，请联系管理员检查绑定状态。',
  KOVAR_FORBIDDEN: '绑定账户无权访问该资源，请联系管理员检查账户权限。',
  KOVAR_REQUEST_REJECTED: '上游服务未接受该操作，请刷新确认状态后重试。',
  KOVAR_CONTRACT_INCOMPLETE: '服务返回的数据格式异常，请联系管理员。',
  UPSTREAM_INVALID_RESPONSE: '服务返回的数据格式异常，请联系管理员。',
}

const STATUS_MESSAGES: Record<number, string> = {
  400: '输入不符合接口要求，请检查后重试。',
  401: '请重新登录。',
  403: '当前账号没有操作权限。',
  404: '资源不存在，请刷新后重试。',
  409: '状态已变化，请刷新确认后重试。',
  422: '输入未通过业务校验，请检查后重试。',
  429: '请求过于频繁，请稍后重试。',
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly requestId?: string,
    cause?: unknown,
  ) {
    super(MESSAGES[code] ?? STATUS_MESSAGES[status] ?? '服务暂时不可用，请稍后重试。', { cause })
    this.name = 'AppError'
  }
}

export type ActionResult =
  { ok: true; warning?: string } | { ok: false; message: string; requestId?: string }

export function actionFailure(error: unknown): ActionResult {
  if (error instanceof AppError) {
    return {
      ok: false,
      message: error.message,
      ...(error.requestId ? { requestId: error.requestId } : {}),
    }
  }
  return { ok: false, message: '操作未完成，请刷新确认状态后重试。' }
}
