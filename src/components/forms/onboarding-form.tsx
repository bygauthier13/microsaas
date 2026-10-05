"use client";

import { useActionState, useState } from "react";
import clsx from "clsx";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { onboardingAction } from "@/lib/actions/org";
import type { ActionState } from "@/lib/actions/helpers";
import { ORG_KINDS } from "@/lib/domain";

export function OnboardingForm({ defaultName, defaultEmail }: { defaultName: string; defaultEmail: string }) {
  const [state, action] = useActionState<ActionState, FormData>(onboardingAction, {});
  const [kind, setKind] = useState<string>("letting_agent");
  const [jurisdiction, setJurisdiction] = useState<string>("scotland");
  return (
    <form action={action} className="space-y-7">
      {state.error ? <Alert tone="bad">{state.error}</Alert> : null}

      <fieldset>
        <legend className="text-sm font-medium mb-2">Which describes you?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {ORG_KINDS.map((k) => (
            <label
              key={k.value}
              className={clsx(
                "cursor-pointer rounded-xl border px-4 py-3 transition-colors",
                kind === k.value ? "border-ink bg-surface ring-2 ring-ink/10" : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <input type="radio" name="kind" value={k.value} checked={kind === k.value} onChange={() => setKind(k.value)} className="sr-only" />
              <span className="block font-medium">{k.label}</span>
              <span className="block text-xs text-muted mt-0.5">{k.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium mb-2">Where are most of your homes?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { v: "scotland", t: "Scotland", d: "New damp & mould duties for private and social landlords from 6 Oct 2026." },
            { v: "england", t: "England", d: "Awaab’s Law for social landlords (Phase 2 from 30 Nov 2026). Private: benchmark tracking." },
          ].map((o) => (
            <label
              key={o.v}
              className={clsx(
                "cursor-pointer rounded-xl border px-4 py-3 transition-colors",
                jurisdiction === o.v ? "border-ink bg-surface ring-2 ring-ink/10" : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <input type="radio" name="jurisdiction" value={o.v} checked={jurisdiction === o.v} onChange={() => setJurisdiction(o.v)} className="sr-only" />
              <span className="block font-medium">{o.t}</span>
              <span className="block text-xs text-muted mt-0.5 leading-relaxed">{o.d}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted mt-2">You can set each home’s nation individually later.</p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={kind === "private_landlord" ? "Name on your letters" : "Organisation name"} htmlFor="orgName">
          <Input id="orgName" name="orgName" required placeholder={kind === "letting_agent" ? "e.g. Lothian Lettings" : kind === "social_landlord" ? "e.g. Westfield Housing Co-operative" : "e.g. R. Patel Properties"} />
        </Field>
        <Field label="Roughly how many homes?" htmlFor="homes" hint="Helps us suggest the right plan.">
          <Input id="homes" name="homes" type="number" min={1} max={100000} placeholder="e.g. 250" inputMode="numeric" />
        </Field>
        <Field label="Letters signed by" htmlFor="signatoryName">
          <Input id="signatoryName" name="signatoryName" defaultValue={defaultName} />
        </Field>
        <Field label="Their role" htmlFor="signatoryRole">
          <Input id="signatoryRole" name="signatoryRole" placeholder="e.g. Property Manager" />
        </Field>
        <Field label="Phone for tenants" htmlFor="phone" hint="Printed on written summaries.">
          <Input id="phone" name="phone" type="tel" placeholder="0131 555 0100" />
        </Field>
        <Field label="Reply-to email for tenants" htmlFor="replyToEmail">
          <Input id="replyToEmail" name="replyToEmail" type="email" defaultValue={defaultEmail} />
        </Field>
      </div>

      <SubmitButton size="lg" pendingLabel="Setting up…">Continue — log your first report</SubmitButton>
    </form>
  );
}
