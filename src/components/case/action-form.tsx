"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { FormPendingContext } from "@/components/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Alert } from "@/components/ui";
import { useToast } from "@/components/toast";
import type { ActionState } from "@/lib/actions/helpers";

/**
 * Wraps a server action form with inline success / error feedback. Children are rendered
 * inside the <form>, so server components can compose fields freely.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  encType,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  encType?: "multipart/form-data";
}) {
  const toast = useToast();
  const { state, pending, onSubmit } = useFormAction<ActionState>(async (prev, fd) => {
    const result = await action(prev, fd);
    // Confirm via the layout-level toast: this form may unmount once its step is complete.
    if (result.ok && result.message && !/https?:\/\//.test(result.message)) toast(result.message);
    return result;
  }, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <FormPendingContext.Provider value={pending}>
      <form ref={ref} onSubmit={onSubmit} className={className} encType={encType}>
        {state.error ? (
          <Alert tone="bad" className="mb-4">
            {state.error}
          </Alert>
        ) : null}
        {state.ok && state.message ? (
          <Alert tone="ok" className="mb-4">
            <Linkify text={state.message} />
          </Alert>
        ) : null}
        {children}
      </form>
    </FormPendingContext.Provider>
  );
}

/** Messages can contain a one-time approval URL — make it clickable and copyable. */
function Linkify({ text }: { text: string }) {
  const match = text.match(/https?:\/\/\S+/);
  if (!match) return <>{text}</>;
  const url = match[0];
  const [before, after] = text.split(url);
  return (
    <>
      {before}
      <span className="mt-2 flex flex-wrap items-center gap-2">
        <code className="break-all rounded bg-surface px-2 py-1 text-xs border border-line">{url}</code>
        <button
          type="button"
          className="text-xs font-semibold underline underline-offset-2"
          onClick={() => void navigator.clipboard?.writeText(url)}
        >
          Copy link
        </button>
      </span>
      {after}
    </>
  );
}
