const MESSAGES: Record<string, string> = {
  INVALID_ADMIN_CREDENTIALS: 'Incorrect username or password.',
  INVALID_ADMIN_TOKEN: 'Your session has expired. Please sign in again.',
  AGENT_NOT_FOUND: 'Agent not found.',
  INVALID_AGENT_ADDRESS: 'Invalid Agent address format.',
  INVALID_AGENT_STATE: 'The Agent state has changed. Refresh and try again.',
  INVALID_REQUEST: 'The request is invalid. Check the input and try again.',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  REQUEST_TIMEOUT: 'The request timed out. Refresh to confirm the current status.',
  REQUEST_CANCELLED: 'The request was cancelled.',
  NETWORK_ERROR: 'Unable to reach the service. Please try again later.',
  INVALID_RESPONSE: 'The service returned an unexpected response. Contact an administrator.',
  KOVAR_AUTH_FAILED:
    'The linked account authentication has expired. Contact an administrator to check the binding.',
  KOVAR_FORBIDDEN:
    'The linked account cannot access this resource. Contact an administrator to check permissions.',
  KOVAR_REQUEST_REJECTED:
    'The upstream service rejected the operation. Refresh and confirm the status before retrying.',
  KOVAR_CONTRACT_INCOMPLETE:
    'The service returned an unexpected response. Contact an administrator.',
  UPSTREAM_INVALID_RESPONSE:
    'The service returned an unexpected response. Contact an administrator.',
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'The request is invalid. Check the input and try again.',
  401: 'Please sign in again.',
  403: 'Your account does not have permission to perform this action.',
  404: 'The resource was not found. Refresh and try again.',
  409: 'The state has changed. Refresh and confirm before retrying.',
  422: 'The input failed validation. Check the input and try again.',
  429: 'Too many requests. Please try again later.',
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly requestId?: string,
    cause?: unknown,
  ) {
    super(
      MESSAGES[code] ??
        STATUS_MESSAGES[status] ??
        'The service is temporarily unavailable. Please try again later.',
      { cause },
    )
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
  return {
    ok: false,
    message: 'The operation did not complete. Refresh and confirm the status before retrying.',
  }
}
