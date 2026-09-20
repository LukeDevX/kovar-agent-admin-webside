'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { policySchema, type Policy } from '../schemas'
import { updateBudget } from '../actions'

const FIELDS = [
  { key: 'per_request_limit', label: '单次请求上限' },
  { key: 'daily_limit', label: '每日上限' },
  { key: 'monthly_limit', label: '每月上限' },
] as const

export function BudgetForm({ agentId, policy }: { agentId: string; policy: Policy }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Policy>({ resolver: zodResolver(policySchema), defaultValues: policy })
  async function onSubmit(values: Policy) {
    setError('')
    try {
      const result = await updateBudget(agentId, values)
      if (!result.ok) {
        setError(result.message + (result.requestId ? ` 请求编号：${result.requestId}` : ''))
        toast.error(result.message)
        return
      }
      reset(values)
      toast.success('预算已更新')
      router.refresh()
    } catch {
      setError('操作未完成，请刷新确认预算后重试。')
    }
  }
  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        单位：Kovar quota units。输入非负整数，0 表示零额度。
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label htmlFor={key} className="mb-2 block text-sm font-medium">
              {label}
            </label>
            <Input
              id={key}
              inputMode="numeric"
              {...register(key)}
              aria-invalid={Boolean(errors[key])}
              aria-describedby={errors[key] ? `${key}-error` : undefined}
              disabled={isSubmitting}
            />
            {errors[key] && (
              <p id={`${key}-error`} className="mt-1 text-sm text-destructive">
                {errors[key].message}
              </p>
            )}
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="break-words text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? '保存中…' : '保存预算'}
      </Button>
    </form>
  )
}
