'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { submitLogin } from './actions'

export function LoginForm() {
  const [result, formAction, isPending] = useActionState(submitLogin, null)

  return (
    <form action={formAction} noValidate className="space-y-5">
      <div>
        <label htmlFor="username" className="mb-2 block text-sm font-medium">
          Username
        </label>
        <Input id="username" autoComplete="username" name="username" required />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          name="password"
          required
        />
      </div>
      {!result?.ok && result && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 p-3 text-sm text-destructive"
        >
          {result.message}
        </p>
      )}
      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? 'Signing in...' : 'Sign in to admin console'}
      </Button>
    </form>
  )
}
