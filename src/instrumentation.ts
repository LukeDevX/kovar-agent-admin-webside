import type { Instrumentation } from 'next'

export const onRequestError: Instrumentation.onRequestError = async (_error, _request, context) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logger } = await import('@/lib/logger')
    // Framework errors can embed credentials or upstream data; log a sanitized error.
    logger.error(
      {
        event: 'request_failed',
        route: context.routePath,
        err: new Error('Unhandled application error'),
      },
      'Request failed',
    )
  }
}
