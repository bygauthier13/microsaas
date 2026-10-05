"use client";

import { Alert, Field, Input } from "@/components/ui";
import { FormPendingContext, SubmitButton } from "@/components/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { acceptInviteAction } from "@/lib/actions/team";
import type { ActionState } from "@/lib/actions/helpers";

export function AcceptInviteForm({ token, email, signedIn }: { token: string; email: string; signedIn: boolean }) {
  const { state, pending, onSubmit } = useFormAction<ActionState>(acceptInviteAction, {});
  return (
    <FormPendingContext.Provider value={pending}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <input type="hidden" name="token" value={token} />
        {state.error ? <Alert tone="bad">{state.error}</Alert> : null}
        {signedIn ? null : (
          <>
            <Field label="Email">
              <Input value={email} readOnly disabled />
            </Field>
            <Field label="Your name" htmlFor="name">
              <Input id="name" name="name" autoComplete="name" required />
            </Field>
            <Field label="Choose a password" htmlFor="password" hint="At least 10 characters.">
              <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
            </Field>
          </>
        )}
        <SubmitButton className="w-full" pendingLabel="Joining…">
          {signedIn ? "Join the workspace" : "Create account & join"}
        </SubmitButton>
      </form>
    </FormPendingContext.Provider>
  );
}
