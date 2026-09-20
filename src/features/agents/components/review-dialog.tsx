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
  approve: '批准',
  reject: '拒绝',
  suspend: '暂停',
  resume: '恢复',
  revoke: '撤销授权',
}
const DESCRIPTIONS: Record<ReviewAction, string> = {
  approve: '批准后，Agent 将获得访问权限。',
  reject: '拒绝此次申请，Agent 保持已注册状态。',
  suspend: '暂停后，Agent 将无法通过请求认证。',
  resume: '恢复后，Agent 可重新通过请求认证。',
  revoke: '撤销后，Agent 将失去访问权限，并尝试删除上游 Token。已撤销的 Agent 无法恢复。',
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
        setError(result.message + (result.requestId ? ` 请求编号：${result.requestId}` : ''))
        toast.error(result.message)
        return
      }
      if (result.warning) {
        onWarning(result.warning)
        toast.warning(result.warning)
      } else {
        onWarning('')
        toast.success(`${LABELS[action]}成功`)
      }
      setOpen(false)
      reset()
      router.refresh()
    } catch {
      setError('操作未完成，请刷新确认 Agent 状态后重试。')
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
            ? '重试撤销清理'
            : LABELS[action]}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle className="text-lg font-semibold">确认{LABELS[action]}</AlertDialogTitle>
        <AlertDialogDescription className="text-sm text-muted-foreground">
          {DESCRIPTIONS[action]}
          <span className="mt-3 block break-all font-mono text-xs">{agent.agent_id}</span>
        </AlertDialogDescription>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label htmlFor={`remark-${action}`} className="mb-2 block text-sm font-medium">
              审核备注（可选）
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
              {errors.remark?.message ?? '最多 1000 UTF-8 字节。'}
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
                取消
              </Button>
            </AlertDialogCancel>
            <Button
              type="submit"
              variant={action === 'revoke' ? 'destructive' : 'default'}
              disabled={isSubmitting}
            >
              {isSubmitting ? '处理中…' : `确认${LABELS[action]}`}
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
