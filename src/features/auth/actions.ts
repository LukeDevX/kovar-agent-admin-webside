'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { gateway, SESSION_COOKIE } from '@/lib/api/gateway'
import { actionFailure, type ActionResult } from '@/lib/api/errors'

import { loginSchema, loginResponseSchema } from './schemas'

export async function login(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: '请检查用户名和密码。' }
  try {
    const session = await gateway('/login', loginResponseSchema, {
      method: 'POST',
      body: JSON.stringify(parsed.data),
      public: true,
    })
    ;(await cookies()).set(SESSION_COOKIE, session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: session.expires_in,
    })
    return { ok: true }
  } catch (error) {
    return actionFailure(error)
  }
}

export async function submitLogin(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const result = await login({
    username: formData.get('username'),
    password: formData.get('password'),
  })
  if (result.ok) redirect('/')
  return result
}

export async function logout(): Promise<void> {
  ;(await cookies()).delete(SESSION_COOKIE)
  redirect('/login')
}
