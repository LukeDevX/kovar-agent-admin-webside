'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { gateway } from '@/lib/api/gateway'
import { AppError, actionFailure, type ActionResult } from '@/lib/api/errors'

import {
  addressSchema,
  policySchema,
  reviewActionSchema,
  reviewResponseSchema,
  reviewSchema,
  serializePolicy,
} from './schemas'

function refreshAgent(id: string) {
  revalidatePath(`/agents/${id}`)
  revalidatePath('/agents')
  revalidatePath('/whitelist')
}

function mutationFailure(error: unknown): ActionResult {
  if (error instanceof AppError && error.status === 401) redirect('/login')
  return actionFailure(error)
}

export async function updateBudget(id: unknown, input: unknown): Promise<ActionResult> {
  const address = addressSchema.safeParse(id)
  const policy = policySchema.safeParse(input)
  if (!address.success || !policy.success)
    return {
      ok: false,
      message: 'Invalid address or budget. Enter a non-negative int64 integer.',
    }
  try {
    await gateway(`/agents/${encodeURIComponent(address.data)}/budget`, policySchema, {
      method: 'PUT',
      body: serializePolicy(policy.data),
    })
    refreshAgent(address.data)
    return { ok: true }
  } catch (error) {
    return mutationFailure(error)
  }
}

export async function reviewAgent(
  id: unknown,
  action: unknown,
  input: unknown,
): Promise<ActionResult> {
  const address = addressSchema.safeParse(id)
  const operation = reviewActionSchema.safeParse(action)
  const body = reviewSchema.safeParse(input)
  if (!address.success || !operation.success || !body.success)
    return {
      ok: false,
      message: 'Invalid operation parameters. The remark must not exceed 1000 UTF-8 bytes.',
    }
  try {
    const result = await gateway(
      `/agents/${encodeURIComponent(address.data)}/${operation.data}`,
      reviewResponseSchema,
      { method: 'POST', body: JSON.stringify(body.data) },
    )
    refreshAgent(address.data)
    return {
      ok: true,
      ...(result.token_deletion_pending
        ? {
            warning:
              'Agent authorization has been revoked, but upstream token deletion is still pending. Run Revoke access again to retry cleanup.',
          }
        : {}),
    }
  } catch (error) {
    return mutationFailure(error)
  }
}
