"use client";

import clsx from "clsx";
import { CheckCircle2, CircleAlert, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useActionState, useMemo, useState, useTransition } from "react";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { useToast } from "@/components/toast";
import { issueSummaryAction } from "@/lib/actions/cases";
import { improveSummaryAction } from "@/lib/actions/documents";
import type { ActionState } from "@/lib/actions/helpers";
import { checkWrittenSummary } from "@/lib/docs/checklist";

type Style = "plain" | "concise" | "formal";

export function SummaryEditor(props: {
  caseId: string;
  initialBody: string;
  jurisdiction: "scotland" | "england";
  hazardFound: boolean | null;
  tenantEmail: string | null;
  aiEnabled: boolean;
  todayIso: string;
  nowTime: string;
  dueLabel?: string | null;
  reissue?: boolean;
}) {
  const toast = useToast();
  const [state, formAction] = useActionState<ActionState, FormData>(async (prev: ActionState, fd: FormData) => {
    const result = await issueSummaryAction(prev, fd);
    if (result.ok && result.message) toast(result.message);
    return result;
  }, {});
  const [body, setBody] = useState(props.initialBody);
  const [method, setMethod] = useState(props.tenantEmail ? "email" : "post");
  const [style, setStyle] = useState<Style>("plain");
  const [ai, setAi] = useState<{ error?: string; message?: string; previous?: string }>({});
  const [aiPending, startAi] = useTransition();
  const checklist = useMemo(
    () => checkWrittenSummary(body, { jurisdiction: props.jurisdiction, hazardFound: props.hazardFound }),
    [body, props.jurisdiction, props.hazardFound],
  );
  const missing = checklist.filter((i) => !i.ok).length;

  function improve() {
    setAi({});
    startAi(async () => {
      const res = await improveSummaryAction(props.caseId, body, style);
      if (res.draft) {
        setAi({ message: res.message, previous: body });
        setBody(res.draft);
      } else {
        setAi({ error: res.error ?? "The AI couldn't improve this draft." });
      }
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="caseId" value={props.caseId} />
      {state.error ? <Alert tone="bad">{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="ok">{state.message}</Alert> : null}

      <div className="space-y-5">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              Drafted from your investigation record. Edit freely — blank line = new paragraph, <code className="text-xs">## </code>= heading,{" "}
              <code className="text-xs">- </code>= bullet.
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
              onClick={() => {
                setBody(props.initialBody);
                setAi({});
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset to template
            </button>
          </div>

          {props.aiEnabled ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2">
              <Sparkles className="h-4 w-4 text-signal" aria-hidden />
              <span className="text-sm font-medium">Improve with AI</span>
              <Select
                aria-label="AI style"
                value={style}
                onChange={(e) => setStyle(e.target.value as Style)}
                className="h-8 w-auto py-0 text-sm"
                disabled={aiPending}
              >
                <option value="plain">Plain English</option>
                <option value="concise">Shorter</option>
                <option value="formal">More formal</option>
              </Select>
              <Button type="button" size="sm" variant="secondary" onClick={improve} disabled={aiPending}>
                {aiPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {aiPending ? "Drafting…" : "Suggest a rewrite"}
              </Button>
              {ai.previous ? (
                <button
                  type="button"
                  className="text-xs underline underline-offset-2 text-muted hover:text-ink"
                  onClick={() => {
                    setBody(ai.previous!);
                    setAi({});
                  }}
                >
                  Undo AI changes
                </button>
              ) : null}
              <span className="text-xs text-faint basis-full sm:basis-auto sm:ml-auto">Names &amp; addresses are removed before sending.</span>
            </div>
          ) : null}
          {ai.error ? <Alert tone="warn">{ai.error}</Alert> : null}
          {ai.message ? <Alert tone="info">{ai.message}</Alert> : null}

          <Textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={22}
            className={clsx("text-[0.92rem]", aiPending && "opacity-60")}
            aria-label="Written summary text"
            required
            readOnly={aiPending}
          />
        </div>

        <aside className="space-y-2">
          <p className="eyebrow">Content check</p>
          <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {checklist.map((item) => (
              <li key={item.label} className="flex gap-2 text-sm leading-snug">
                {item.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
                ) : (
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
                )}
                <span className={item.ok ? "text-ink-2" : "text-ink font-medium"}>
                  {item.label}
                  {!item.ok && item.hint ? <span className="block text-xs font-normal text-muted">{item.hint}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="pt-1 text-xs text-muted leading-relaxed">
            A quick automated check, not legal advice. You remain responsible for the content.
          </p>
        </aside>
      </div>

      <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Date issued" htmlFor="issued_date">
          <Input id="issued_date" name="issued_date" type="date" defaultValue={props.todayIso} max={props.todayIso} required />
        </Field>
        <Field label="Time" htmlFor="issued_time">
          <Input id="issued_time" name="issued_time" type="time" defaultValue={props.nowTime} />
        </Field>
        <Field label="How it's given" htmlFor="method">
          <Select id="method" name="method" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="email">Email</option>
            <option value="post">Post</option>
            <option value="hand">By hand</option>
            <option value="portal">Tenant portal / app</option>
          </Select>
        </Field>
        <div className="flex items-end">
          {method === "email" ? (
            props.tenantEmail ? (
              <label className="flex items-start gap-2 text-sm leading-snug">
                <input type="checkbox" name="sendEmail" value="yes" defaultChecked className="mt-0.5 h-4 w-4 accent-[var(--color-ink)]" />
                <span>
                  Email the PDF to <span className="font-medium break-all">{props.tenantEmail}</span> now
                </span>
              </label>
            ) : (
              <p className="text-xs text-warn leading-relaxed">No tenant email on file — add one to the property, or choose post / by hand.</p>
            )
          ) : (
            <p className="text-xs text-muted leading-relaxed">We&apos;ll file a PDF on the case for you to print or upload.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton variant="signal" pendingLabel="Issuing…">
          {props.reissue ? "Issue updated summary" : "Issue written summary"}
        </SubmitButton>
        <p className="text-sm text-muted">
          {missing ? `${missing} content check${missing === 1 ? "" : "s"} outstanding. ` : "All content checks pass. "}
          {props.dueLabel ? `Due ${props.dueLabel}.` : null}
        </p>
      </div>
    </form>
  );
}
