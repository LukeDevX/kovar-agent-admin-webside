import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'

import { gateway } from '@/lib/api/gateway'
import { AppError } from '@/lib/api/errors'

import { adminSchema } from './schemas'

export const requireAdmin = cache(async () => {
  try {
    return await gateway('/me', adminSchema)
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect('/login')
    throw error
  }
})
