'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

import { availableActions, reviewSchema, type Agent, type ReviewAction } from '../schemas'
import { reviewAgent } from '../actions'

const LABELS: Record<ReviewAction, string> = {
  approve: 'Approve',
  reject: 'Reject',
  suspend: 'Suspend',
  resume: 'Resume',
  revoke: 'Revoke access',
}
const DESCRIPTIONS: Record<ReviewAction, string> = {
  approve: 'After approval, the Agent will gain access.',
  reject: 'Reject this application; the Agent remains registered.',
  suspend: 'After suspension, the Agent can no longer pass request authentication.',
  resume: 'After resuming, the Agent can pass request authentication again.',
  revoke:
    'After revocation, the Agent loses access and the upstream token is deleted. A revoked Agent cannot be restored.',
}

function ReviewDialog({
  agent,
  action,
  onWarning,
}: {
  agent: Agent
  action: ReviewAction
  onWarning: (message: string) => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ remark: string }>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { remark: '' },
  })
  async function onSubmit(values: { remark: string }) {
    setError('')
    try {
      const result = await reviewAgent(agent.agent_id, action, values)
      if (!result.ok) {
        setError(result.message + (result.requestId ? ` Request ID: ${result.requestId}` : ''))
        toast.error(result.message)
        return
      }
      if (result.warning) {
        onWarning(result.warning)
        toast.warning(result.warning)
      } else {
        onWarning('')
        toast.success(`${LABELS[action]} completed`)
      }
      setOpen(false)
      reset()
      router.refresh()
    } catch {
      setError(
        'The operation did not complete. Refresh and confirm the Agent status before retrying.',
      )
    }
  }
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) {
          setOpen(next)
          if (next) setError('')
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant={action === 'revoke' ? 'destructive' : 'outline'}>
          {agent.agent_status === 'REVOKED' && action === 'revoke'
            ? 'Retry revocation cleanup'
            : LABELS[action]}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle className="text-lg font-semibold">
          Confirm {LABELS[action]}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-sm text-muted-foreground">
          {DESCRIPTIONS[action]}
          <span className="mt-3 block break-all font-mono text-xs">{agent.agent_id}</span>
        </AlertDialogDescription>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label htmlFor={`remark-${action}`} className="mb-2 block text-sm font-medium">
              Review remark (optional)
            </label>
            <textarea
              id={`remark-${action}`}
              {...register('remark')}
              rows={3}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.remark)}
              aria-describedby={`remark-${action}-help`}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            <p
              id={`remark-${action}-help`}
              className={
                errors.remark ? 'text-sm text-destructive' : 'text-xs text-muted-foreground'
              }
            >
              {errors.remark?.message ?? 'Up to 1000 UTF-8 bytes.'}
            </p>
          </div>
          {error && (
            <p role="alert" className="break-words text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </AlertDialogCancel>
            <Button
              type="submit"
              variant={action === 'revoke' ? 'destructive' : 'default'}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : `Confirm ${LABELS[action]}`}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ReviewActions({ agent }: { agent: Agent }) {
  const [warning, setWarning] = useState('')
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {availableActions(agent).map((action) => (
          <ReviewDialog agent={agent} action={action} key={action} onWarning={setWarning} />
        ))}
      </div>
      {warning && (
        <p role="status" className="rounded-md border p-3 text-sm">
          {warning}
        </p>
      )}
    </div>
  )
}
