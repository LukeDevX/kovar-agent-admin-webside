import { ShieldCheck } from 'lucide-react'

import { LoginForm } from '@/features/auth/login-form'

export const metadata = { title: 'Admin sign in' }

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <section className="w-full max-w-sm rounded-lg border bg-card p-7 shadow-sm">
        <div className="mb-7">
          <ShieldCheck className="mb-5 size-8 text-primary" />
          <p className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground">
            KOVAR · AGENT ADMIN
          </p>
          <h1 className="text-2xl font-semibold">Admin sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use a Gateway admin account to access the console.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  )
}
