"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Alert, Field, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { respondApprovalAction } from "@/lib/actions/approvals";
import type { ActionState } from "@/lib/actions/helpers";

export function ApprovalResponseForm({ token, landlordName }: { token: string; landlordName: string }) {
  const [state, action] = useActionState<ActionState, FormData>(respondApprovalAction, {});
  const [decision, setDecision] = useState<"approved" | "declined">("approved");

  if (state.ok) {
    return (
      <div className="card p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-ok" aria-hidden />
        <p className="mt-3 font-semibold">{state.message}</p>
        <p className="mt-1 text-sm text-muted">You can close this page.</p>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4 p-5 sm:p-6">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="decision" value={decision} />
      {state.error ? <Alert tone="bad">{state.error}</Alert> : null}
      <fieldset>
        <legend className="text-sm font-medium">Your decision</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["approved", "declined"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDecision(d)}
              aria-pressed={decision === d}
              className={
                decision === d
                  ? d === "approved"
                    ? "h-12 rounded-lg border-2 border-ok bg-ok-soft font-semibold text-ok"
                    : "h-12 rounded-lg border-2 border-bad bg-bad-soft font-semibold text-bad"
                  : "h-12 rounded-lg border border-line-strong bg-surface font-medium text-ink-2 hover:bg-paper"
              }
            >
              {d === "approved" ? "Approve" : "Decline"}
            </button>
          ))}
        </div>
      </fieldset>
      <Field
        label={decision === "declined" ? "Reason (required)" : "Note for your agent (optional)"}
        htmlFor="note"
      >
        <Textarea
          id="note"
          name="note"
          rows={3}
          required={decision === "declined"}
          placeholder={decision === "declined" ? "e.g. I'd like a second quote first — please call me." : "e.g. Go ahead. Please send photos once done."}
        />
      </Field>
      <Field label="Type your full name to confirm" htmlFor="signedName" hint={`Recorded with the date and time on the case log, as ${landlordName}'s decision.`}>
        <Input id="signedName" name="signedName" required autoComplete="name" />
      </Field>
      <SubmitButton size="lg" className="w-full" variant={decision === "approved" ? "primary" : "danger"} pendingLabel="Recording…">
        {decision === "approved" ? "Confirm approval" : "Confirm decline"}
      </SubmitButton>
    </form>
  );
}
