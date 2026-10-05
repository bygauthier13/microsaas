"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import {
  forgotPasswordAction,
  loginAction,
  resetPasswordAction,
  signupAction,
  type FormState,
} from "@/lib/auth/actions";

const initial: FormState = {};

export function LoginForm({ next, expired }: { next?: string; expired?: boolean }) {
  const [state, action] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {expired ? <Alert tone="info">Your session ended. Please sign in again.</Alert> : null}
      {state.error ? <Alert tone="bad">{state.error}</Alert> : null}
      <input type="hidden" name="next" value={next ?? "/app"} />
      <Field label="Work email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} />
      </Field>
      <Field
        label={
          <span className="flex justify-between">
            Password
            <Link href="/forgot-password" className="text-xs font-normal text-muted underline underline-offset-2">
              Forgotten it?
            </Link>
          </span>
        }
        htmlFor="password"
      >
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

export function SignupForm({ source }: { source?: string }) {
  const [state, action] = useActionState(signupAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error ? <Alert tone="bad">{state.error}</Alert> : null}
      <input type="hidden" name="source" value={source ?? ""} />
      <Field label="Your name" htmlFor="name">
        <Input id="name" name="name" autoComplete="name" required defaultValue={state.fields?.name} />
      </Field>
      <Field label="Work email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 10 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Creating your account…">Start 14-day free trial</SubmitButton>
      <p className="text-xs text-muted leading-relaxed">
        No card needed. By creating an account you agree to the{" "}
        <Link href="/legal/terms" className="underline underline-offset-2">terms</Link> and{" "}
        <Link href="/legal/privacy" className="underline underline-offset-2">privacy notice</Link>.
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error ? <Alert tone="bad">{state.error}</Alert> : null}
      {state.message ? <Alert tone="ok">{state.message}</Alert> : null}
      <Field label="Work email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Sending…">Email me a reset link</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error ? <Alert tone="bad">{state.error}</Alert> : null}
      <input type="hidden" name="token" value={token} />
      <Field label="New password" htmlFor="password" hint="At least 10 characters. You'll be signed out of other devices.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Saving…">Save new password</SubmitButton>
    </form>
  );
}
