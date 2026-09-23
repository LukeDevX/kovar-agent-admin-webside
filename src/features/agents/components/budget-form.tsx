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
  { key: 'per_request_limit', label: 'Per-request limit' },
  { key: 'daily_limit', label: 'Daily limit' },
  { key: 'monthly_limit', label: 'Monthly limit' },
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
        setError(result.message + (result.requestId ? ` Request ID: ${result.requestId}` : ''))
        toast.error(result.message)
        return
      }
      reset(values)
      toast.success('Budget updated')
      router.refresh()
    } catch {
      setError('The operation did not complete. Refresh and confirm the budget before retrying.')
    }
  }
  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Unit: Kovar quota units. Enter a non-negative integer; 0 means zero quota.
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
        {isSubmitting ? 'Saving...' : 'Save budget'}
      </Button>
    </form>
  )
}
