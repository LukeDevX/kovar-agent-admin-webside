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
    return { ok: false, message: '地址或预算无效，请输入非负 int64 整数。' }
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
    return { ok: false, message: '操作参数无效，备注不能超过 1000 UTF-8 字节。' }
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
        ? { warning: 'Agent 授权已撤销，但上游 Token 删除尚未完成。可再次执行撤销授权以重试清理。' }
        : {}),
    }
  } catch (error) {
    return mutationFailure(error)
  }
}
